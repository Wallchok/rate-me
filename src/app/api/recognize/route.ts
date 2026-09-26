import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPersonId, unauthorized } from "@/lib/session";
import { getAiKey } from "@/lib/secret-settings";
import { askAi, ProviderError } from "@/lib/ai";

const MAX_SIZE = 2 * 1024 * 1024;
// Caps cost (OpenAI) or the free quota (Gemini) even if a phone with a session is misused
const DAILY_LIMIT = 60;

const PROMPT = `Na zdjęciu jest przód opakowania produktu spożywczego ze sklepu w Polsce.
Odczytaj nazwę produktu po polsku (bez marki), markę i gramaturę lub pojemność (np. "20 x 2 g", "500 ml").
Kategorię wybierz wyłącznie z podanej listy; jeśli żadna nie pasuje, zwróć null.
Czego nie widać na zdjęciu, zwróć jako null. Nie zgaduj marki, której nie widać.`;

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

  let parsed: Record<string, string | null>;
  try {
    parsed = await askAi(ai, prompt, { name: {}, brand: {}, size: {}, category: { enum: names } }, base64);
  } catch (error) {
    // Provider message only, never the key
    console.error("Recognize failed:", error instanceof ProviderError ? error.message : "network error");
    const limit = error instanceof ProviderError && / 429 /.test(error.message);
    return NextResponse.json(
      { error: limit ? "Wyczerpany limit rozpoznań, spróbuj później" : "Nie udało się rozpoznać produktu" },
      { status: 502 },
    );
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
