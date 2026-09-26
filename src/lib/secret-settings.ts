import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const OPENAI_KEY = "openai_api_key";

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

async function storedOpenAiKey(): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: OPENAI_KEY } });
  if (!row) return null;
  try {
    return decrypt(row.value);
  } catch {
    // AUTH_SECRET changed since it was saved: the key has to be entered again
    return null;
  }
}

// Vercel env wins, then the key saved in the app
export async function getOpenAiKey(): Promise<string | null> {
  return process.env.OPENAI_API_KEY?.trim() || (await storedOpenAiKey());
}

export async function openAiKeyStatus() {
  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  const key = fromEnv || (await storedOpenAiKey());
  return {
    configured: Boolean(key),
    source: fromEnv ? ("env" as const) : key ? ("app" as const) : null,
    // Never the key itself, only its end to recognise which one it is
    hint: key ? key.slice(-4) : null,
  };
}

export async function saveOpenAiKey(key: string) {
  const value = encrypt(key);
  await prisma.appSetting.upsert({ where: { key: OPENAI_KEY }, update: { value }, create: { key: OPENAI_KEY, value } });
}

export async function deleteOpenAiKey() {
  await prisma.appSetting.deleteMany({ where: { key: OPENAI_KEY } });
}
