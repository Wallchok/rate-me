import "server-only";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

// Public URLs of our store look like https://<store id>.public.blob.vercel-storage.com/...
function isOurBlob(url: URL) {
  if (!url.hostname.endsWith(".public.blob.vercel-storage.com")) return false;
  const storeId = process.env.BLOB_STORE_ID?.replace(/^store_/, "").toLowerCase();
  return !storeId || url.hostname.startsWith(`${storeId}.`);
}

// Removes a photo from Vercel Blob when its product is gone or got a new photo.
// Only files from our own store that no other product still uses; any failure leaves an orphaned file.
export async function deleteBlobPhoto(url: string | null | undefined) {
  if (!url) return;
  try {
    if (!isOurBlob(new URL(url))) return;
    const stillUsed = await prisma.product.count({ where: { imageUrl: url } });
    if (stillUsed > 0) return;
    await del(url);
  } catch (error) {
    console.error("Blob delete failed", error);
  }
}
