import "server-only";
import { del } from "@vercel/blob";

// Removes a photo from Vercel Blob when its product is gone or got a new photo.
// Other URLs (Open Food Facts, local /uploads) are left alone; a failure only leaves an orphaned file.
export async function deleteBlobPhoto(url: string | null | undefined) {
  if (!url) return;
  try {
    if (!new URL(url).hostname.endsWith(".blob.vercel-storage.com")) return;
    await del(url);
  } catch (error) {
    console.error("Blob delete failed", error);
  }
}
