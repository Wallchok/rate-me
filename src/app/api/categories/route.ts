import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJson } from "@/lib/http";
import { getPersonId, isUniqueViolation, unauthorized } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const body = await readJson(request);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!name) return NextResponse.json({ error: "Podaj nazwę kategorii" }, { status: 400 });

  try {
    const category = await prisma.category.create({ data: { name } });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: "Taka kategoria już jest" }, { status: 409 });
    throw error;
  }
}
