import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const storeId = searchParams.get("storeId");
    const categoryId = searchParams.get("categoryId");

    const where: Record<string, unknown> = {};
    if (storeId) where.storeId = Number(storeId);
    if (categoryId) where.categoryId = Number(categoryId);

    const products = await prisma.product.findMany({
      where,
      include: { category: true, store: true, ratings: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, categoryId, storeId, imageUrl, price, calories, protein, carbs, fat } = body;

    if (!name || !categoryId) {
      return NextResponse.json({ error: "name and categoryId are required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        categoryId: Number(categoryId),
        storeId: storeId ? Number(storeId) : null,
        imageUrl: imageUrl || null,
        price: price != null ? Number(price) : null,
        calories: calories != null ? Number(calories) : null,
        protein: protein != null ? Number(protein) : null,
        carbs: carbs != null ? Number(carbs) : null,
        fat: fat != null ? Number(fat) : null,
      },
      include: { category: true, store: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
