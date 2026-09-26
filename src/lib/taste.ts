import { ratingOf } from "@/lib/ranking";
import type { Person, Product, SyncData } from "@/lib/types";

export interface PairStats {
  a: Person;
  b: Person;
  // Products both have rated
  shared: number;
  // 100% = identical scores, 0% = opposite ends of the 1-10 scale
  agreement: number | null;
  differences: { product: Product; scoreA: number; scoreB: number }[];
  bothLove: Product[];
}

export interface TasteStats {
  pairs: PairStats[];
  favouriteCategory: { person: Person; category: string; avg: number }[];
  discoveries: Product[];
}

const LOVE_FROM = 8;
const DAY = 24 * 60 * 60 * 1000;

function pair(products: Product[], a: Person, b: Person): PairStats {
  const both = products
    .map((product) => ({ product, ra: ratingOf(product, a.id), rb: ratingOf(product, b.id) }))
    .filter((x) => x.ra && x.rb)
    .map((x) => ({ product: x.product, scoreA: x.ra!.score, scoreB: x.rb!.score }));
  const gap = both.length ? both.reduce((sum, x) => sum + Math.abs(x.scoreA - x.scoreB), 0) / both.length : null;
  return {
    a,
    b,
    shared: both.length,
    agreement: gap === null ? null : Math.round((1 - gap / 9) * 100),
    differences: both
      .filter((x) => Math.abs(x.scoreA - x.scoreB) >= 3)
      .sort((x, y) => Math.abs(y.scoreA - y.scoreB) - Math.abs(x.scoreA - x.scoreB))
      .slice(0, 5),
    bothLove: both
      .filter((x) => x.scoreA >= LOVE_FROM && x.scoreB >= LOVE_FROM)
      .sort((x, y) => y.scoreA + y.scoreB - (x.scoreA + x.scoreB))
      .slice(0, 5)
      .map((x) => x.product),
  };
}

export function tasteStats(data: SyncData, now = Date.now()): TasteStats {
  const pairs: PairStats[] = [];
  for (let i = 0; i < data.persons.length; i++) {
    for (let j = i + 1; j < data.persons.length; j++) pairs.push(pair(data.products, data.persons[i], data.persons[j]));
  }

  // Category with the best average, counting only categories with at least 2 ratings
  const favouriteCategory = data.persons.flatMap((person) => {
    const byCategory = new Map<number, number[]>();
    for (const p of data.products) {
      const r = ratingOf(p, person.id);
      if (r) byCategory.set(p.categoryId, [...(byCategory.get(p.categoryId) ?? []), r.score]);
    }
    let best: { category: string; avg: number } | null = null;
    for (const [categoryId, scores] of byCategory) {
      if (scores.length < 2) continue;
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const name = data.categories.find((c) => c.id === categoryId)?.name;
      if (name && (!best || avg > best.avg)) best = { category: name, avg: Math.round(avg * 10) / 10 };
    }
    return best ? [{ person, ...best }] : [];
  });

  // Rated in the last 30 days and liked by everyone who rated them
  const discoveries = data.products
    .filter((p) => {
      const recent = p.ratings.filter((r) => now - Date.parse(r.updatedAt) <= 30 * DAY);
      return recent.length > 0 && p.ratings.every((r) => r.score >= LOVE_FROM);
    })
    .sort((x, y) => {
      const avg = (p: Product) => p.ratings.reduce((s, r) => s + r.score, 0) / p.ratings.length;
      return avg(y) - avg(x);
    })
    .slice(0, 5);

  return { pairs, favouriteCategory, discoveries };
}
