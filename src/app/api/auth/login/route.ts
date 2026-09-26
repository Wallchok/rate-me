import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJson } from "@/lib/http";
import { checkHouseholdPassword, setSession } from "@/lib/session";

const WINDOW_MS = 15 * 60 * 1000;
// Per address, and for everyone together (guessing from many addresses at once)
const MAX_PER_IP = 10;
const MAX_TOTAL = 30;

function clientIp(request: NextRequest) {
  // Vercel sets x-forwarded-for; the first address is the client
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const since = new Date(Date.now() - WINDOW_MS);

  // Record the attempt first, then count: parallel requests cannot all see a count below the limit
  const attempt = await prisma.loginFailure.create({ data: { ip } });
  const [fromIp, total] = await Promise.all([
    prisma.loginFailure.count({ where: { ip, createdAt: { gte: since } } }),
    prisma.loginFailure.count({ where: { createdAt: { gte: since } } }),
  ]);
  // Old entries are useless after the window; keep the table small
  await prisma.loginFailure.deleteMany({ where: { createdAt: { lt: since } } });

  if (fromIp > MAX_PER_IP || total > MAX_TOTAL) {
    return NextResponse.json(
      { error: "Za dużo nieudanych prób. Spróbuj ponownie za kwadrans." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  const body = await readJson(request);
  const password = typeof body.password === "string" ? body.password : "";

  if (!password || !checkHouseholdPassword(password)) {
    // The recorded attempt stays and counts; the delay slows down a single guesser
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 401 });
  }

  // A correct password does not count as a failure
  await prisma.loginFailure.delete({ where: { id: attempt.id } });
  await setSession({ household: true });
  return NextResponse.json({ ok: true });
}
