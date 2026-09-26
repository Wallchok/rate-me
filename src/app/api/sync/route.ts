import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, refreshSessionIfOld, setSession, unauthorized } from "@/lib/session";
import type { SyncData } from "@/lib/types";

// Whole household data in one response. It is small, so the device keeps a full copy for offline use.
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!session.personId) return unauthorized("no_person");

  const [persons, categories, products] = await Promise.all([
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
  ]);

  // Person could have been deleted on another phone: keep the household login, ask "who are you" again.
  // Without this the cookie still has personId, so proxy bounces /login back to / in a loop.
  if (!persons.some((p) => p.id === session.personId)) {
    await setSession({ household: true });
    return unauthorized("no_person");
  }

  await refreshSessionIfOld(session);

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
    syncedAt: new Date().toISOString(),
  };

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
