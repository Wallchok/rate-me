import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const persons = await prisma.person.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(persons);
  } catch (error) {
    console.error("GET /api/persons error:", error);
    return NextResponse.json({ error: "Failed to fetch persons" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const person = await prisma.person.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Person with this name already exists" }, { status: 409 });
    }
    console.error("POST /api/persons error:", error);
    return NextResponse.json({ error: "Failed to create person" }, { status: 500 });
  }
}
