import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseId, readJson } from "@/lib/http";
import { getSession, isUniqueViolation, setSession, unauthorized } from "@/lib/session";

// "Who are you" step: pick an existing person or create yourself
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await readJson(request);
  let person;

  if (typeof body.name === "string" && body.name.trim()) {
    const name = body.name.trim().slice(0, 40);
    try {
      person = await prisma.person.create({ data: { name } });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json({ error: "Taka osoba już istnieje, wybierz ją z listy" }, { status: 409 });
      }
      throw error;
    }
  } else {
    const personId = parseId(body.personId);
    person = personId ? await prisma.person.findUnique({ where: { id: personId } }) : null;
    if (!person) return NextResponse.json({ error: "Nie ma takiej osoby" }, { status: 404 });
  }

  await setSession({ household: true, personId: person.id });
  return NextResponse.json({ id: person.id, name: person.name });
}
