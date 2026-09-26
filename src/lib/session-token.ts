import { createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";

// Shared by proxy.ts and route handlers, so no next/headers here
export const SESSION_COOKIE = "rateme_session";
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60; // seconds

export interface SessionPayload {
  // Household password was accepted on this device
  household: true;
  // Chosen person, missing until the "who are you" step is done
  personId?: number;
  iat?: number;
}

// Short fingerprint of the household password inside every session:
// changing the password logs out all phones, because old sessions no longer match
function passwordFingerprint() {
  const password = process.env.HOUSEHOLD_PASSWORD?.replace(/[\r\n]+$/, "") ?? "";
  return createHash("sha256").update(`rateme-session:${password}`).digest("base64url").slice(0, 16);
}

function getKey() {
  const secret = process.env.AUTH_SECRET;
  // A short secret could be brute-forced offline from a single cookie
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: Omit<SessionPayload, "iat">) {
  return new SignJWT({ ...payload, pw: passwordFingerprint() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    if (payload.household !== true || payload.pw !== passwordFingerprint()) return null;
    return {
      household: true,
      personId: typeof payload.personId === "number" ? payload.personId : undefined,
      iat: payload.iat,
    };
  } catch {
    return null;
  }
}
