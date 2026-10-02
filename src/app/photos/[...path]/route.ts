import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { getSession } from "@/lib/session";

// Serves own product photos from the private Blob store, only to logged-in phones.
// File names are random UUIDs and never change, so the phone may keep them for good.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await getSession())) return new NextResponse(null, { status: 401 });

  const pathname = (await params).path.join("/");
  if (!/^products\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(pathname)) return new NextResponse(null, { status: 404 });

  const result = await get(pathname, { access: "private" }).catch((error) => {
    console.error("Blob read failed", error);
    return null;
  });
  if (!result?.stream) return new NextResponse(null, { status: 404 });

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType ?? "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
