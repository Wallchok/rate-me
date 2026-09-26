import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPersonId, unauthorized } from "@/lib/session";
import { getOpenAiKey } from "@/lib/secret-settings";

const MODEL = "gpt-5-nano";
const MAX_SIZE = 2 * 1024 * 1024;

const PROMPT = `Na zdjęciu jest przód opakowania produktu spożywczego ze sklepu w Polsce.
Odczytaj nazwę produktu po polsku (bez marki), markę i gramaturę lub pojemność (np. "20 x 2 g", "500 ml").
Kategorię wybierz wyłącznie z podanej listy; jeśli żadna nie pasuje, zwróć null.
Czego nie widać na zdjęciu, zwróć jako null. Nie zgaduj marki, której nie widać.`;

// Reads name, brand, size and category from a photo of the packaging (OpenAI vision).
// Used when the barcode is not in any product database.
export async function POST(request: NextRequest) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const apiKey = await getOpenAiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Rozpoznawanie ze zdjęcia nie jest włączone. Wklej klucz OpenAI w Ustawieniach." }, { status: 501 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.type !== "image/jpeg") {
    return NextResponse.json({ error: "Brak zdjęcia" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Zdjęcie za duże" }, { status: 400 });

  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const names = categories.map((c) => c.name);
  const image = `data:image/jpeg;base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model: MODEL,
        reasoning: { effort: "minimal" },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: `${PROMPT}\nKategorie: ${names.join(", ")}` },
              { type: "input_image", image_url: image, detail: "auto" },
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
                category: { type: ["string", "null"], enum: [...names, null] },
              },
              required: ["name", "brand", "size", "category"],
            },
          },
        },
      }),
    });
  } catch {
    return NextResponse.json({ error: "Rozpoznawanie nie odpowiada, spróbuj jeszcze raz" }, { status: 502 });
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json) {
    console.error("OpenAI recognize failed", res.status, json?.error?.message);
    return NextResponse.json({ error: "Nie udało się rozpoznać produktu" }, { status: 502 });
  }

  // Responses API: the answer is the output_text part of the message item
  const text = (json.output ?? [])
    .flatMap((item: { type?: string; content?: { type?: string; text?: string }[] }) =>
      item.type === "message" ? (item.content ?? []) : []
    )
    .find((c: { type?: string }) => c.type === "output_text")?.text;

  let parsed: { name: string | null; brand: string | null; size: string | null; category: string | null };
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
