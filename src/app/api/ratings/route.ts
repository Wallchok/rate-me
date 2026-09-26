import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseId, readJson } from "@/lib/http";
import { getPersonId, unauthorized } from "@/lib/session";
import { parseRatingInput } from "@/lib/product-input";

// Saves the logged-in person's rating. personId never comes from the request body.
export async function PUT(request: NextRequest) {
  const personId = await getPersonId();
  if (!personId) return unauthorized("no_person");

  const body = await readJson(request);
  const productId = parseId(body.productId);
  if (!productId) return NextResponse.json({ error: "Nie ma takiego produktu" }, { status: 404 });
  const rating = parseRatingInput(body);
  if (typeof rating === "string") return NextResponse.json({ error: rating }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Nie ma takiego produktu" }, { status: 404 });

  await prisma.rating.upsert({
    where: { productId_personId: { productId, personId } },
    update: rating,
    create: { ...rating, productId, personId },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const personId = await getPersonId();
  if (!personId) return unauthorized("no_person");

  const productId = parseId(request.nextUrl.searchParams.get("productId"));
  if (!productId) return NextResponse.json({ error: "Nie ma takiego produktu" }, { status: 404 });
  await prisma.rating.deleteMany({ where: { productId, personId } });
  return NextResponse.json({ ok: true });
}
