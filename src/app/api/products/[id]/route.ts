import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseId, readJson } from "@/lib/http";
import { getPersonId, isNotFound, isUniqueViolation, unauthorized } from "@/lib/session";
import { parseProductInput } from "@/lib/product-input";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  const body = await readJson(request);
  const input = parseProductInput(body);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });

  const { newCategory, categoryId, ...fields } = input;

  try {
    await prisma.$transaction(async (tx) => {
      const category = newCategory
        ? await tx.category.upsert({ where: { name: newCategory }, update: {}, create: { name: newCategory } })
        : await tx.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new Error("CATEGORY_NOT_FOUND");

      await tx.product.update({ where: { id: id }, data: { ...fields, categoryId: category.id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "CATEGORY_NOT_FOUND") {
      return NextResponse.json({ error: "Nie ma takiej kategorii" }, { status: 400 });
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Inny produkt ma już ten kod kreskowy" }, { status: 409 });
    }
    if (isNotFound(error)) return NextResponse.json({ error: "Nie ma takiego produktu" }, { status: 404 });
    throw error;
  }
}

// Ratings go away with the product (cascade)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  try {
    await prisma.product.delete({ where: { id: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isNotFound(error)) return NextResponse.json({ error: "Nie ma takiego produktu" }, { status: 404 });
    throw error;
  }
}
