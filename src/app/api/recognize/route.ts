import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPersonId, unauthorized } from "@/lib/session";
import { getAiKey } from "@/lib/secret-settings";

const OPENAI_MODEL = "gpt-5-nano";
// Newest free Flash first; the older one in case the newer id is not available for this key
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"];
const MAX_SIZE = 2 * 1024 * 1024;
// Caps cost (OpenAI) or the free quota (Gemini) even if a phone with a session is misused
const DAILY_LIMIT = 60;

const PROMPT = `Na zdjęciu jest przód opakowania produktu spożywczego ze sklepu w Polsce.
Odczytaj nazwę produktu po polsku (bez marki), markę i gramaturę lub pojemność (np. "20 x 2 g", "500 ml").
Kategorię wybierz wyłącznie z podanej listy; jeśli żadna nie pasuje, zwróć null.
Czego nie widać na zdjęciu, zwróć jako null. Nie zgaduj marki, której nie widać.`;

interface Recognized {
  name: string | null;
  brand: string | null;
  size: string | null;
  category: string | null;
}

class ProviderError extends Error {}

async function askOpenAi(key: string, prompt: string, base64: string, categories: string[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: OPENAI_MODEL,
      // Do not keep the household's photos in the OpenAI account logs
      store: false,
      reasoning: { effort: "minimal" },
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: `data:image/jpeg;base64,${base64}`, detail: "auto" },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "product",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: ["string", "null"] },
              brand: { type: ["string", "null"] },
              size: { type: ["string", "null"] },
              category: { type: ["string", "null"], enum: [...categories, null] },
            },
            required: ["name", "brand", "size", "category"],
          },
        },
      },
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) throw new ProviderError(`OpenAI ${res.status} ${json?.error?.message ?? ""}`);
  // Responses API: the answer is the output_text part of the message item
  return (json.output ?? [])
    .flatMap((item: { type?: string; content?: { type?: string; text?: string }[] }) =>
      item.type === "message" ? (item.content ?? []) : []
    )
    .find((c: { type?: string }) => c.type === "output_text")?.text;
}

async function askGemini(key: string, prompt: string, base64: string, categories: string[]): Promise<string> {
  const body = JSON.stringify({
    contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: base64 } }, { text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", nullable: true },
          brand: { type: "STRING", nullable: true },
          size: { type: "STRING", nullable: true },
          category: { type: "STRING", nullable: true, enum: categories },
        },
        required: ["name", "brand", "size", "category"],
      },
    },
  });
  let last = "";
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body,
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json) return json.candidates?.[0]?.content?.parts?.[0]?.text;
    last = `Gemini ${model} ${res.status} ${json?.error?.message ?? ""}`;
    // Unknown model for this key: try the next one; anything else is a real failure
    if (res.status !== 404) break;
  }
  throw new ProviderError(last);
}

// Reads name, brand, size and category from a photo of the packaging.
// Used when the barcode is not in any product database. The key is never sent to the phone.
export async function POST(request: NextRequest) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const ai = await getAiKey();
  if (!ai) {
    return NextResponse.json(
      { error: "Rozpoznawanie ze zdjęcia nie jest włączone. Wklej klucz AI w Ustawieniach." },
      { status: 501 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.type !== "image/jpeg") {
    return NextResponse.json({ error: "Brak zdjęcia" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Zdjęcie za duże" }, { status: 400 });

  const counterKey = `recognize:${new Date().toISOString().slice(0, 10)}`;
  const usage = await prisma.usageCounter.upsert({
    where: { key: counterKey },
    update: { count: { increment: 1 } },
    create: { key: counterKey, count: 1 },
  });
  if (usage.count > DAILY_LIMIT) {
    return NextResponse.json({ error: `Dzisiejszy limit rozpoznań (${DAILY_LIMIT}) wyczerpany, jutro znowu zadziała` }, { status: 429 });
  }

  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const names = categories.map((c) => c.name);
  const prompt = `${PROMPT}\nKategorie: ${names.join(", ")}`;
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  let text: string;
  try {
    text =
      ai.provider === "openai"
        ? await askOpenAi(ai.key, prompt, base64, names)
        : await askGemini(ai.key, prompt, base64, names);
  } catch (error) {
    // Provider message only, never the key
    console.error("Recognize failed:", error instanceof ProviderError ? error.message : "network error");
    const limit = error instanceof ProviderError && / 429 /.test(error.message);
    return NextResponse.json(
      { error: limit ? "Wyczerpany limit rozpoznań, spróbuj później" : "Nie udało się rozpoznać produktu" },
      { status: 502 },
    );
  }

  let parsed: Recognized;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Nie udało się rozpoznać produktu" }, { status: 502 });
  }

  const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const name = clean(parsed.name, 150);
  const size = clean(parsed.size, 30);
  return NextResponse.json({
    // Size in the name tells variants apart on the shelf
    name: name ? (size ? `${name}, ${size}` : name) : null,
    brand: clean(parsed.brand, 100),
    categoryId: categories.find((c) => c.name === parsed.category)?.id ?? null,
  });
}
