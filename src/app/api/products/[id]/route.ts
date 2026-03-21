import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: { category: true, store: true, ratings: { include: { person: true } } },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, categoryId, storeId, imageUrl, price, calories, protein, carbs, fat } = body;

    const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(categoryId !== undefined && { categoryId: Number(categoryId) }),
        ...(storeId !== undefined && { storeId: storeId ? Number(storeId) : null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(price !== undefined && { price: price != null ? Number(price) : null }),
        ...(calories !== undefined && { calories: calories != null ? Number(calories) : null }),
        ...(protein !== undefined && { protein: protein != null ? Number(protein) : null }),
        ...(carbs !== undefined && { carbs: carbs != null ? Number(carbs) : null }),
        ...(fat !== undefined && { fat: fat != null ? Number(fat) : null }),
      },
      include: { category: true, store: true },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.product.delete({ where: { id: Number(id) } });

    return NextResponse.json({ message: "Product deleted" });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
