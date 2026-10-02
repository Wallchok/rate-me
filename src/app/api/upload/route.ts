import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { getPersonId, unauthorized } from "@/lib/session";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
function hasImageSignature(b: Buffer, type: string) {
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === "image/png") return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/webp") return b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
  return false;
}

const MAX_SIZE = 2 * 1024 * 1024; // photos are compressed on the phone to ~150 KB first

export async function POST(request: NextRequest) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Brak pliku" }, { status: 400 });

  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Dozwolone: JPG, PNG, WebP" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Plik za duży (maks. 2 MB)" }, { status: 400 });

  // The declared type comes from the client, so check the file's first bytes too
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasImageSignature(bytes, file.type)) {
    return NextResponse.json({ error: "To nie wygląda na zdjęcie" }, { status: 400 });
  }

  const filename = `${randomUUID()}.${ext}`;

  // Vercel Blob in production: a connected store gives BLOB_STORE_ID (auth via Vercel OIDC),
  // older setups give BLOB_READ_WRITE_TOKEN. @vercel/blob picks the right one itself.
  // The store is private: photos are served only to logged-in phones through /photos/...
  if (process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(`products/${filename}`, bytes, { access: "private", contentType: file.type });
    } catch (error) {
      console.error("Blob upload failed", error);
      return NextResponse.json({ error: "Nie udało się zapisać zdjęcia na serwerze" }, { status: 500 });
    }
    return NextResponse.json({ url: `/photos/products/${filename}` });
  }

  // Local dev only: Vercel's filesystem is read-only
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Brak konfiguracji Vercel Blob (podepnij Blob do projektu)" }, { status: 500 });
  }
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return NextResponse.json({ url: `/uploads/${filename}` });
}
