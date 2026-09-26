import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseId, readJson } from "@/lib/http";
import { getPersonId, unauthorized } from "@/lib/session";

// "I will not rate this" for the logged-in person; replaces their rating if there was one
export async function PUT(request: NextRequest) {
  const personId = await getPersonId();
  if (!personId) return unauthorized("no_person");

  const productId = parseId((await readJson(request)).productId);
  if (!productId) return NextResponse.json({ error: "Nie ma takiego produktu" }, { status: 404 });
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Nie ma takiego produktu" }, { status: 404 });

  await prisma.$transaction([
    prisma.rating.deleteMany({ where: { productId, personId } }),
    prisma.skip.upsert({
      where: { productId_personId: { productId, personId } },
      update: {},
      create: { productId, personId },
    }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const personId = await getPersonId();
  if (!personId) return unauthorized("no_person");

  const productId = parseId(request.nextUrl.searchParams.get("productId"));
  if (!productId) return NextResponse.json({ error: "Nie ma takiego produktu" }, { status: 404 });
  await prisma.skip.deleteMany({ where: { productId, personId } });
  return NextResponse.json({ ok: true });
}
