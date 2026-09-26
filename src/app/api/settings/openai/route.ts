import { NextRequest, NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { getExistingPersonId, unauthorized } from "@/lib/session";
import { deleteOpenAiKey, openAiKeyStatus, saveOpenAiKey } from "@/lib/secret-settings";

export async function GET() {
  if (!(await getExistingPersonId())) return unauthorized("no_person");
  return NextResponse.json(await openAiKeyStatus());
}

// Saves the key only after OpenAI confirms it works
export async function PUT(request: NextRequest) {
  if (!(await getExistingPersonId())) return unauthorized("no_person");

  const key = String((await readJson(request)).key ?? "").trim();
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(key)) {
    return NextResponse.json({ error: "To nie wygląda na klucz OpenAI (zaczyna się od sk-)" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return NextResponse.json({ error: "Nie udało się połączyć z OpenAI, spróbuj jeszcze raz" }, { status: 502 });
  }
  if (res.status === 401) return NextResponse.json({ error: "OpenAI nie przyjmuje tego klucza" }, { status: 400 });
  if (!res.ok) return NextResponse.json({ error: "OpenAI odpowiada błędem, spróbuj później" }, { status: 502 });

  await saveOpenAiKey(key);
  return NextResponse.json(await openAiKeyStatus());
}

export async function DELETE() {
  if (!(await getExistingPersonId())) return unauthorized("no_person");
  await deleteOpenAiKey();
  return NextResponse.json(await openAiKeyStatus());
}
