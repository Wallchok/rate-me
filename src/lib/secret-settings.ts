import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const AI_KEY = "ai_api_key";
// Name used by an earlier version; removed together with the current one
const OLD_KEYS = ["openai_api_key"];

export type AiProvider = "openai" | "gemini";
export interface AiKey {
  provider: AiProvider;
  key: string;
}

// OpenAI keys start with sk-, Google (Gemini) API keys with AIza
export function providerOf(key: string): AiProvider | null {
  if (/^sk-[A-Za-z0-9_-]{20,}$/.test(key)) return "openai";
  if (/^AIza[A-Za-z0-9_-]{30,}$/.test(key)) return "gemini";
  return null;
}

// AES-256-GCM with a key derived from AUTH_SECRET: the database alone does not reveal the secret
function cipherKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHash("sha256").update(`rateme-settings:${secret}`).digest();
}

function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cipherKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

function decrypt(stored: string) {
  const raw = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", cipherKey(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

function fromEnv(): AiKey | null {
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) return { provider: "openai", key: openai };
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (gemini) return { provider: "gemini", key: gemini };
  return null;
}

async function stored(): Promise<AiKey | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: AI_KEY } });
  if (!row) return null;
  try {
    const key = decrypt(row.value);
    const provider = providerOf(key);
    return provider ? { provider, key } : null;
  } catch {
    // AUTH_SECRET changed since it was saved: the key has to be entered again
    return null;
  }
}

// Vercel env wins, then the key saved in the app
export async function getAiKey(): Promise<AiKey | null> {
  return fromEnv() ?? (await stored());
}

export async function aiKeyStatus() {
  const env = fromEnv();
  const key = env ?? (await stored());
  return {
    configured: Boolean(key),
    provider: key?.provider ?? null,
    source: env ? ("env" as const) : key ? ("app" as const) : null,
    // Never the key itself, only its end to recognise which one it is
    hint: key ? key.key.slice(-4) : null,
  };
}

export async function saveAiKey(key: string) {
  const value = encrypt(key);
  await prisma.appSetting.upsert({ where: { key: AI_KEY }, update: { value }, create: { key: AI_KEY, value } });
  await prisma.appSetting.deleteMany({ where: { key: { in: OLD_KEYS } } });
}

export async function deleteAiKey() {
  await prisma.appSetting.deleteMany({ where: { key: { in: [AI_KEY, ...OLD_KEYS] } } });
}
