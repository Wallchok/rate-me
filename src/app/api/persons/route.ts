import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

// Needed by the login screen before a person is chosen
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const persons = await prisma.person.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json(persons);
}
