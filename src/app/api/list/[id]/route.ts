import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseId, readJson } from "@/lib/http";
import { getPersonId, unauthorized } from "@/lib/session";
import { guessCategory } from "@/lib/list-category";

type RouteParams = { params: Promise<{ id: string }> };

// Ids are UUIDs made on the phone; every call is safe to repeat (the phone retries after being offline)
function parseItemId(id: string) {
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

// Add an item or change its text
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const personId = await getPersonId();
  if (!personId) return unauthorized("no_person");

  const id = parseItemId((await params).id);
  if (!id) return NextResponse.json({ error: "Nieprawidłowa pozycja" }, { status: 400 });
  const body = await readJson(request);
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 120) : "";
  if (!text) return NextResponse.json({ error: "Wpisz, co kupić" }, { status: 400 });

  const productId = parseId(body.productId);
  const product = productId
    ? await prisma.product.findUnique({ where: { id: productId }, select: { id: true, categoryId: true } })
    : null;

  // Deleted on another phone meanwhile: a repeated "add" must not bring it back
  const current = await prisma.shoppingItem.findUnique({
    where: { id },
    select: { deletedAt: true, text: true, categoryId: true },
  });
  if (current?.deletedAt) return NextResponse.json({ ok: true });

  // A linked product knows its category; plain text gets a guess (names, then AI)
  const categoryId = product
    ? product.categoryId
    : current && current.text === text
      ? current.categoryId
      : await guessCategory(text);

  await prisma.shoppingItem.upsert({
    where: { id },
    update: { text, productId: product?.id ?? null, categoryId },
    create: { id, text, productId: product?.id ?? null, categoryId, addedById: personId },
  });
  return NextResponse.json({ ok: true });
}

// Mark as bought (by the logged-in person) or back to buy
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const personId = await getPersonId();
  if (!personId) return unauthorized("no_person");

  const id = parseItemId((await params).id);
  if (!id) return NextResponse.json({ error: "Nieprawidłowa pozycja" }, { status: 400 });
  const body = await readJson(request);
  const bought = body.bought === true;

  // Time of the tap on the phone, so a purchase sent after the signal came back keeps its real time.
  // Accepted only within the last week and not in the future.
  const now = Date.now();
  const tapped = typeof body.at === "string" ? Date.parse(body.at) : NaN;
  const boughtAt = new Date(tapped > now - 7 * 24 * 60 * 60 * 1000 && tapped <= now + 60 * 1000 ? tapped : now);

  // updateMany: an item deleted on the other phone is simply gone, not an error
  await prisma.shoppingItem.updateMany({
    where: { id, deletedAt: null },
    data: bought ? { boughtById: personId, boughtAt } : { boughtById: null, boughtAt: null },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const id = parseItemId((await params).id);
  if (!id) return NextResponse.json({ error: "Nieprawidłowa pozycja" }, { status: 400 });
  // Marked, not removed: see PUT
  await prisma.shoppingItem.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
