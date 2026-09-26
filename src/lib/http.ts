import type { NextRequest } from "next/server";

// Positive integer id from a route param, query or JSON; null for "abc", "1.5", -1 and the like
export function parseId(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// JSON object body; anything else (invalid JSON, null, array) becomes {}
export async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body : {};
}
