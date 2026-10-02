import "server-only";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

// Own photos live in the private Blob store and are referenced as /photos/products/<file>
export const PHOTO_PREFIX = "/photos/";

// Removes a photo from Vercel Blob when its product is gone or got a new photo.
// Only our own photos that no other product still uses; any failure leaves an orphaned file.
export async function deleteBlobPhoto(url: string | null | undefined) {
  if (!url?.startsWith(PHOTO_PREFIX)) return;
  try {
    const stillUsed = await prisma.product.count({ where: { imageUrl: url } });
    if (stillUsed > 0) return;
    await del(url.slice(PHOTO_PREFIX.length));
  } catch (error) {
    console.error("Blob delete failed", error);
  }
}
