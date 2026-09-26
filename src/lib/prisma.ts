import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Turso in production, local SQLite file (same one Prisma CLI uses) in dev.
  // On Vercel a missing Turso URL must fail loudly, not fall back to a file.
  // Values pasted or piped into Vercel can carry a trailing newline, which libsql rejects as "Invalid URL"
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (process.env.VERCEL && !tursoUrl) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }
  const url = tursoUrl || process.env.DATABASE_URL?.trim() || "file:./dev.db";
  const authToken = url.startsWith("file:") ? undefined : process.env.TURSO_AUTH_TOKEN?.trim();

  const adapter = new PrismaLibSql({ url, authToken });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
