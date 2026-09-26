import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJson } from "@/lib/http";
import { getPersonId, isUniqueViolation, unauthorized } from "@/lib/session";
import { parseProductInput, parseRatingInput } from "@/lib/product-input";

// Creates a product, optionally with a new category and the author's first rating
export async function POST(request: NextRequest) {
  const personId = await getPersonId();
  if (!personId) return unauthorized("no_person");

  const body = await readJson(request);
  const input = parseProductInput(body);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });

  const rating =
    body.rating && typeof body.rating === "object" ? parseRatingInput(body.rating as Record<string, unknown>) : null;
  if (typeof rating === "string") return NextResponse.json({ error: rating }, { status: 400 });

  if (input.ean) {
    const existing = await prisma.product.findUnique({ where: { ean: input.ean } });
    if (existing) {
      return NextResponse.json(
        { error: "Ten produkt już jest w bazie", productId: existing.id },
        { status: 409 },
      );
    }
  }

  const { newCategory, categoryId, ...fields } = input;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const category = newCategory
        ? await tx.category.upsert({ where: { name: newCategory }, update: {}, create: { name: newCategory } })
        : await tx.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new Error("CATEGORY_NOT_FOUND");

      return tx.product.create({
        data: {
          ...fields,
          categoryId: category.id,
          ...(rating && { ratings: { create: { ...rating, personId } } }),
        },
      });
    });
    return NextResponse.json({ id: product.id }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "CATEGORY_NOT_FOUND") {
      return NextResponse.json({ error: "Nie ma takiej kategorii" }, { status: 400 });
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Ten produkt już jest w bazie" }, { status: 409 });
    }
    throw error;
  }
}
