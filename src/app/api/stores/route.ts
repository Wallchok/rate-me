import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(stores);
  } catch (error) {
    console.error("GET /api/stores error:", error);
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const store = await prisma.store.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Store with this name already exists" }, { status: 409 });
    }
    console.error("POST /api/stores error:", error);
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
  }
}
