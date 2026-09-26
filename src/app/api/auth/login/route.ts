import { NextRequest, NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { checkHouseholdPassword, setSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const password = typeof body.password === "string" ? body.password : "";

  if (!password || !checkHouseholdPassword(password)) {
    // Slows down guessing; serverless has no shared memory for a real rate limit
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 401 });
  }

  await setSession({ household: true });
  return NextResponse.json({ ok: true });
}
