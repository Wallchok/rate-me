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

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: Omit<SessionPayload, "iat">) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    if (payload.household !== true) return null;
    return {
      household: true,
      personId: typeof payload.personId === "number" ? payload.personId : undefined,
      iat: payload.iat,
    };
  } catch {
    return null;
  }
}
