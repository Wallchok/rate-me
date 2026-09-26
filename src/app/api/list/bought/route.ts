import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJson } from "@/lib/http";
import { getPersonId, unauthorized } from "@/lib/session";

// "Wyczyść kupione": only the items that were bought on the phone at that moment,
// so a purchase made meanwhile on the other phone is not lost when this is sent later
export async function DELETE(request: NextRequest) {
  if (!(await getPersonId())) return unauthorized("no_person");
  const ids = (await readJson(request)).ids;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Brak pozycji" }, { status: 400 });
  }
  await prisma.shoppingItem.updateMany({
    where: { id: { in: ids.slice(0, 500) }, boughtAt: { not: null }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
