import { NextRequest, NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { getExistingPersonId, unauthorized } from "@/lib/session";
import { aiKeyStatus, deleteAiKey, providerOf, saveAiKey } from "@/lib/secret-settings";

export async function GET() {
  if (!(await getExistingPersonId())) return unauthorized("no_person");
  return NextResponse.json(await aiKeyStatus());
}

// Asks the provider whether the key works; saves it only then
async function keyWorks(provider: "openai" | "gemini", key: string): Promise<boolean | "unreachable"> {
  try {
    const res =
      provider === "openai"
        ? await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(10000),
          })
        : await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
            headers: { "x-goog-api-key": key },
            signal: AbortSignal.timeout(10000),
          });
    if (res.ok) return true;
    // 400/401/403: key rejected; anything else: provider trouble
    return [400, 401, 403].includes(res.status) ? false : "unreachable";
  } catch {
    return "unreachable";
  }
}

export async function PUT(request: NextRequest) {
  if (!(await getExistingPersonId())) return unauthorized("no_person");

  const key = String((await readJson(request)).key ?? "").trim();
  const provider = providerOf(key);
  if (!provider) {
    return NextResponse.json(
      { error: "To nie wygląda na klucz: OpenAI zaczyna się od sk-, Gemini od AIza" },
      { status: 400 },
    );
  }

  const works = await keyWorks(provider, key);
  if (works === "unreachable") {
    return NextResponse.json({ error: "Nie udało się sprawdzić klucza, spróbuj jeszcze raz" }, { status: 502 });
  }
  if (!works) {
    return NextResponse.json(
      { error: provider === "openai" ? "OpenAI nie przyjmuje tego klucza" : "Google nie przyjmuje tego klucza" },
      { status: 400 },
    );
  }

  await saveAiKey(key);
  return NextResponse.json(await aiKeyStatus());
}

export async function DELETE() {
  if (!(await getExistingPersonId())) return unauthorized("no_person");
  await deleteAiKey();
  return NextResponse.json(await aiKeyStatus());
}
