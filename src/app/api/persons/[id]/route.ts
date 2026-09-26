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
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  if (!name) return NextResponse.json({ error: "Podaj imię" }, { status: 400 });

  try {
    const person = await prisma.person.update({ where: { id: id }, data: { name } });
    return NextResponse.json({ id: person.id, name: person.name });
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: "Takie imię już jest" }, { status: 409 });
    if (isNotFound(error)) return NextResponse.json({ error: "Nie ma takiej osoby" }, { status: 404 });
    throw error;
  }
}

// Removes the person together with all their ratings (cascade)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const me = await getPersonId();
  if (!me) return unauthorized("no_person");

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (id === me) return NextResponse.json({ error: "Nie możesz usunąć samego siebie" }, { status: 400 });
  try {
    await prisma.person.delete({ where: { id: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isNotFound(error)) return NextResponse.json({ error: "Nie ma takiej osoby" }, { status: 404 });
    throw error;
  }
}
