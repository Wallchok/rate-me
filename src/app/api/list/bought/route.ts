import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJson } from "@/lib/http";
import { getExistingPersonId, unauthorized } from "@/lib/session";

// "Wyczyść kupione": only the items that were bought on the phone at that moment,
// so a purchase made meanwhile on the other phone is not lost when this is sent later
export async function DELETE(request: NextRequest) {
  if (!(await getExistingPersonId())) return unauthorized("no_person");
  const ids = (await readJson(request)).ids;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Brak pozycji" }, { status: 400 });
  }
  await prisma.shoppingItem.deleteMany({ where: { id: { in: ids.slice(0, 500) }, boughtAt: { not: null } } });
  return NextResponse.json({ ok: true });
}
