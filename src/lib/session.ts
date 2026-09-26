import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/session-token";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function setSession(payload: Omit<SessionPayload, "iat">) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Extends the cookie when the app is used, so nobody gets logged out in a shop
export async function refreshSessionIfOld(session: SessionPayload) {
  const dayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  if (session.iat && session.iat < dayAgo) {
    await setSession({ household: true, personId: session.personId });
  }
}

export function checkHouseholdPassword(input: string) {
  // A trailing newline from pasting into Vercel would make the real password never match
  const expected = process.env.HOUSEHOLD_PASSWORD?.replace(/[\r\n]+$/, "");
  if (!expected) throw new Error("HOUSEHOLD_PASSWORD is not set");
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function unauthorized(code: "no_session" | "no_person" = "no_session") {
  return NextResponse.json({ error: "Unauthorized", code }, { status: 401 });
}

// Person logged in on this device, or null. Also checks the person still exists (could be deleted
// on another phone); a missing person keeps the household login and asks "who are you" again.
export async function getPersonId(): Promise<number | null> {
  const session = await getSession();
  if (!session?.personId) return null;
  const { prisma } = await import("@/lib/prisma");
  const exists = await prisma.person.findUnique({ where: { id: session.personId }, select: { id: true } });
  if (exists) return exists.id;
  await setSession({ household: true });
  return null;
}

export function isUniqueViolation(error: unknown) {
  return (error as { code?: string }).code === "P2002";
}

export function isNotFound(error: unknown) {
  return (error as { code?: string }).code === "P2025";
}
