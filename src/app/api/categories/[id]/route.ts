import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseId, readJson } from "@/lib/http";
import { getPersonId, isNotFound, isUniqueViolation, unauthorized } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  const body = await readJson(request);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!name) return NextResponse.json({ error: "Podaj nazwę kategorii" }, { status: 400 });

  try {
    const category = await prisma.category.update({ where: { id: id }, data: { name } });
    return NextResponse.json(category);
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: "Taka kategoria już jest" }, { status: 409 });
    if (isNotFound(error)) return NextResponse.json({ error: "Nie ma takiej kategorii" }, { status: 404 });
    throw error;
  }
}

// Only empty categories can be deleted, so products are never lost by accident
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `W tej kategorii są produkty (${count}). Przenieś je albo usuń najpierw.` },
      { status: 409 },
    );
  }

  try {
    await prisma.category.delete({ where: { id: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isNotFound(error)) return NextResponse.json({ error: "Nie ma takiej kategorii" }, { status: 404 });
    throw error;
  }
}
