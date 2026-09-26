import type { Person, Product, Rating } from "@/lib/types";
import type { ForWhom } from "@/lib/store";

export const LIKE_FROM = 7;
export const AVOID_UP_TO = 4;

export interface Ranked {
  product: Product;
  // Everyone in the household has rated it
  complete: boolean;
  // Sort value: lowest score among raters ("all") or the person's own score
  key: number;
  avg: number;
}

export interface CategoryRanking {
  // Best first, safe to buy
  ranked: Ranked[];
  // Someone disliked it
  avoid: Ranked[];
  // Nobody (or the chosen person) has rated it yet
  untried: Ranked[];
}

export function ratingOf(product: Product, personId: number): Rating | undefined {
  return product.ratings.find((r) => r.personId === personId);
}

export function isAvoided(r: Rating) {
  return r.score <= AVOID_UP_TO;
}

function householdRatings(product: Product, persons: Person[]) {
  const ids = new Set(persons.map((p) => p.id));
  return product.ratings.filter((r) => ids.has(r.personId));
}

function toRanked(product: Product, persons: Person[], forWhom: ForWhom): Ranked {
  const ratings = householdRatings(product, persons);
  const scores = ratings.map((r) => r.score);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const own = forWhom === "all" ? undefined : ratingOf(product, forWhom);
  return {
    product,
    complete: ratings.length === persons.length,
    // "all": the product that nobody minds wins, not the one one person loves
    key: forWhom === "all" ? (scores.length ? Math.min(...scores) : 0) : (own?.score ?? 0),
    avg,
  };
}

export function rankProducts(products: Product[], persons: Person[], forWhom: ForWhom): CategoryRanking {
  const result: CategoryRanking = { ranked: [], avoid: [], untried: [] };

  for (const product of products) {
    const item = toRanked(product, persons, forWhom);
    const ratings = householdRatings(product, persons);

    if (forWhom === "all") {
      if (ratings.length === 0) result.untried.push(item);
      else if (ratings.some(isAvoided)) result.avoid.push(item);
      else result.ranked.push(item);
    } else {
      const own = ratingOf(product, forWhom);
      if (!own) result.untried.push(item);
      else if (isAvoided(own)) result.avoid.push(item);
      else result.ranked.push(item);
    }
  }

  result.ranked.sort((a, b) =>
    forWhom === "all"
      ? // Rated by everyone first: a 10 from one person says less than 8 and 7 from both
        Number(b.complete) - Number(a.complete) || b.key - a.key || b.avg - a.avg
      : b.key - a.key || b.avg - a.avg,
  );
  result.avoid.sort((a, b) => a.key - b.key);
  result.untried.sort((a, b) => b.avg - a.avg || a.product.name.localeCompare(b.product.name, "pl"));
  return result;
}

// Short human verdict shown next to the scores
export function verdict(product: Product, persons: Person[]): { text: string; tone: "good" | "bad" | "neutral" } {
  const ratings = householdRatings(product, persons);
  const nameOf = (id: number) => persons.find((p) => p.id === id)?.name ?? "?";

  const disliked = ratings.filter((r) => r.score <= AVOID_UP_TO);
  if (disliked.length) {
    return {
      text: disliked.length === persons.length ? "Nikomu nie smakuje" : `Nie smakuje: ${disliked.map((r) => nameOf(r.personId)).join(", ")}`,
      tone: "bad",
    };
  }

  const missing = persons.filter((p) => !ratings.some((r) => r.personId === p.id));
  if (ratings.length === 0) return { text: "Jeszcze nieoceniony", tone: "neutral" };
  if (missing.length) return { text: `Czeka na: ${missing.map((p) => p.name).join(", ")}`, tone: "neutral" };

  if (ratings.every((r) => r.score >= LIKE_FROM)) {
    return { text: persons.length === 1 ? "Lubisz" : "Smakuje wszystkim", tone: "good" };
  }
  const liked = ratings.filter((r) => r.score >= LIKE_FROM);
  if (liked.length) return { text: `Lubi: ${liked.map((r) => nameOf(r.personId)).join(", ")}`, tone: "neutral" };
  return { text: "Tak sobie", tone: "neutral" };
}

// Heading of the category ranking, gender-neutral on purpose
export function rankingTitle(forWhom: ForWhom, persons: Person[]) {
  if (forWhom !== "all") return `Najlepsze dla: ${persons.find((p) => p.id === forWhom)?.name ?? "?"}`;
  return persons.length > 1 ? "Najlepsze dla nas" : "Najlepsze";
}

// Falls back to "all" when the remembered person no longer exists
export function resolveForWhom(forWhom: ForWhom, persons: Person[]): ForWhom {
  return forWhom !== "all" && persons.some((p) => p.id === forWhom) ? forWhom : "all";
}
