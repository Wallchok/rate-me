import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const personId = parseInt(id);

  const countOnly = request.nextUrl.searchParams.get("count") === "true";

  if (countOnly) {
    const count = await prisma.rating.count({
      where: { personId },
    });
    return NextResponse.json({ count });
  }

  const person = await prisma.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  return NextResponse.json(person);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personId = parseInt(id);
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const person = await prisma.person.update({
      where: { id: personId },
      data: { name: name.trim() },
    });

    return NextResponse.json(person);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Person with this name already exists" }, { status: 409 });
    }
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    console.error("PUT /api/persons/[id] error:", error);
    return NextResponse.json({ error: "Failed to update person" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personId = parseInt(id);

    // Delete ratings by this person first
    await prisma.rating.deleteMany({
      where: { personId },
    });

    await prisma.person.delete({
      where: { id: personId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    console.error("DELETE /api/persons/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete person" }, { status: 500 });
  }
}
