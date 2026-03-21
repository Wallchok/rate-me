import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const storeId = parseInt(id);

  const countOnly = request.nextUrl.searchParams.get("count") === "true";

  if (countOnly) {
    const count = await prisma.product.count({
      where: { storeId },
    });
    return NextResponse.json({ count });
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json(store);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storeId = parseInt(id);
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const store = await prisma.store.update({
      where: { id: storeId },
      data: { name: name.trim() },
    });

    return NextResponse.json(store);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Store with this name already exists" }, { status: 409 });
    }
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    console.error("PUT /api/stores/[id] error:", error);
    return NextResponse.json({ error: "Failed to update store" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storeId = parseInt(id);

    // Unlink products from this store (set storeId to null) instead of deleting them
    await prisma.product.updateMany({
      where: { storeId },
      data: { storeId: null },
    });

    await prisma.store.delete({
      where: { id: storeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    console.error("DELETE /api/stores/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }
}
