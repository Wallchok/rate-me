import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, refreshSessionIfOld, setSession, unauthorized } from "@/lib/session";
import type { SyncData } from "@/lib/types";
import { getAiKey } from "@/lib/secret-settings";

// Whole household data in one response. It is small, so the device keeps a full copy for offline use.
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!session.personId) return unauthorized("no_person");

  // Bought items stay visible for a day, then drop off the list
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [persons, categories, products, list] = await Promise.all([
    prisma.person.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        brand: true,
        ean: true,
        categoryId: true,
        imageUrl: true,
        nutriScore: true,
        calories: true,
        protein: true,
        carbs: true,
        sugar: true,
        fat: true,
        createdAt: true,
        ratings: {
          select: { personId: true, score: true, note: true, updatedAt: true },
        },
        skips: { select: { personId: true } },
      },
    }),
    prisma.shoppingItem.findMany({
      where: { deletedAt: null, OR: [{ boughtAt: null }, { boughtAt: { gte: dayAgo } }] },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Person could have been deleted on another phone: keep the household login, ask "who are you" again.
  // Without this the cookie still has personId, so proxy bounces /login back to / in a loop.
  if (!persons.some((p) => p.id === session.personId)) {
    await setSession({ household: true });
    return unauthorized("no_person");
  }

  await refreshSessionIfOld(session);
  // Deleted list items are kept a month as tombstones (for late offline changes), then removed
  await prisma.shoppingItem.deleteMany({ where: { deletedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } });

  const data: SyncData = {
    meId: session.personId,
    persons,
    categories,
    products: products.map(({ skips, ...p }) => ({
      ...p,
      skippedBy: skips.map((s) => s.personId),
      createdAt: p.createdAt.toISOString(),
      ratings: p.ratings.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
    })),
    list: list.map((i) => ({
      id: i.id,
      text: i.text,
      productId: i.productId,
      addedById: i.addedById,
      boughtById: i.boughtById,
      boughtAt: i.boughtAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
    })),
    // Only whether photo recognition is on; the key itself never leaves the server
    aiEnabled: Boolean(await getAiKey()),
    syncedAt: new Date().toISOString(),
  };

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
