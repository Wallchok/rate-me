import type { Person, Product, Rating } from "@/lib/types";
import type { ForWhom } from "@/lib/store";
import { fold } from "@/lib/text";

export const LIKE_FROM = 7;
export const AVOID_UP_TO = 4;

export interface Ranked {
  product: Product;
  // Everyone who rates it has rated it (people who skipped it do not count)
  complete: boolean;
  // Sort value: lowest score among raters ("all") or the person's own score
  key: number;
  avg: number;
}

export interface CategoryRanking {
  // Worth buying: 7 or more, best first
  best: Ranked[];
  // 5-6: fine, but nobody is excited
  maybe: Ranked[];
  // Someone disliked it (4 or less)
  avoid: Ranked[];
  // Nobody (or the chosen person) has rated it yet
  untried: Ranked[];
}

export function ratingOf(product: Product, personId: number): Rating | undefined {
  return product.ratings.find((r) => r.personId === personId);
}

export function hasSkipped(product: Product, personId: number) {
  return (product.skippedBy ?? []).includes(personId);
}

export function isAvoided(r: Rating) {
  return r.score <= AVOID_UP_TO;
}

function householdRatings(product: Product, persons: Person[]) {
  const ids = new Set(persons.map((p) => p.id));
  return product.ratings.filter((r) => ids.has(r.personId));
}

// People whose rating the product still waits for
export function waitingFor(product: Product, persons: Person[]) {
  return persons.filter((p) => !ratingOf(product, p.id) && !hasSkipped(product, p.id));
}

function toRanked(product: Product, persons: Person[], forWhom: ForWhom): Ranked {
  const scores = householdRatings(product, persons).map((r) => r.score);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const own = forWhom === "all" ? undefined : ratingOf(product, forWhom);
  return {
    product,
    complete: waitingFor(product, persons).length === 0,
    // "all": the product that nobody minds wins, not the one one person loves
    key: forWhom === "all" ? (scores.length ? Math.min(...scores) : 0) : (own?.score ?? 0),
    avg,
  };
}

export function rankProducts(products: Product[], persons: Person[], forWhom: ForWhom): CategoryRanking {
  const result: CategoryRanking = { best: [], maybe: [], avoid: [], untried: [] };

  for (const product of products) {
    const item = toRanked(product, persons, forWhom);
    const ratings = householdRatings(product, persons);

    if (forWhom === "all") {
      if (ratings.length === 0) {
        // Skipped by everyone: nothing to show for the household
        if (waitingFor(product, persons).length > 0) result.untried.push(item);
      } else if (ratings.some(isAvoided)) result.avoid.push(item);
      else if (item.key >= LIKE_FROM) result.best.push(item);
      else result.maybe.push(item);
    } else {
      const own = ratingOf(product, forWhom);
      if (!own) {
        if (!hasSkipped(product, forWhom)) result.untried.push(item);
      } else if (isAvoided(own)) result.avoid.push(item);
      else if (own.score >= LIKE_FROM) result.best.push(item);
      else result.maybe.push(item);
    }
  }

  const byScore = (a: Ranked, b: Ranked) =>
    forWhom === "all"
      ? // Rated by everyone first: 8 and 7 from both says more than a 10 from one person
        Number(b.complete) - Number(a.complete) || b.key - a.key || b.avg - a.avg
      : b.key - a.key || b.avg - a.avg;
  result.best.sort(byScore);
  result.maybe.sort(byScore);
  result.avoid.sort((a, b) => a.key - b.key);
  result.untried.sort((a, b) => b.avg - a.avg || a.product.name.localeCompare(b.product.name, "pl"));
  return result;
}

// Short human verdict shown next to the scores
export function verdict(product: Product, persons: Person[]): { text: string; tone: "good" | "bad" | "neutral" } {
  const ratings = householdRatings(product, persons);
  const nameOf = (id: number) => persons.find((p) => p.id === id)?.name ?? "?";
  const names = (rs: Rating[]) => rs.map((r) => nameOf(r.personId)).join(", ");

  const disliked = ratings.filter(isAvoided);
  if (disliked.length) {
    return {
      text: disliked.length === ratings.length && ratings.length > 1 ? "Nikomu nie smakuje" : `Nie smakuje: ${names(disliked)}`,
      tone: "bad",
    };
  }

  const missing = waitingFor(product, persons);
  if (ratings.length === 0) return { text: missing.length ? "Jeszcze nieoceniony" : "Wszyscy pomijają", tone: "neutral" };
  if (missing.length) return { text: `Czeka na: ${missing.map((p) => p.name).join(", ")}`, tone: "neutral" };

  const liked = ratings.filter((r) => r.score >= LIKE_FROM);
  if (liked.length === ratings.length) {
    // Only say "everyone" when nobody skipped it
    const everyone = ratings.length === persons.length && persons.length > 1;
    return { text: everyone ? "Smakuje wszystkim" : persons.length === 1 ? "Lubisz" : `Lubi: ${names(liked)}`, tone: "good" };
  }
  if (liked.length) return { text: `Lubi: ${names(liked)}`, tone: "neutral" };
  return { text: "Może być", tone: "neutral" };
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

// Whole list in shopping order: worth buying, fine, not rated yet, avoid
export function inShoppingOrder(r: CategoryRanking): Ranked[] {
  return [...r.best, ...r.maybe, ...r.untried, ...r.avoid];
}

// Best-rated household product matching a free-text shopping item ("jogurt", "chleb"):
// by product name or brand, then by category name; ignores Polish diacritics.
export function bestMatch(text: string, products: Product[], categories: { id: number; name: string }[], persons: Person[]) {
  const q = fold(text.trim());
  if (q.length < 3) return null;
  const words = q.split(/\s+/).filter((w) => w.length >= 3);
  const matches = (value: string, needle: string) => fold(value).includes(needle);
  // Name, brand and category together: "jogurt" must also find a skyr from "Jogurty", and the ranking picks
  const find = (needle: string) => {
    const ids = new Set(categories.filter((c) => matches(c.name, needle)).map((c) => c.id));
    return products.filter(
      (p) => matches(p.name, needle) || (p.brand && matches(p.brand, needle)) || ids.has(p.categoryId)
    );
  };
  let candidates = find(q);
  for (const w of words) {
    if (candidates.length) break;
    candidates = find(w);
  }
  if (!candidates.length) return null;
  const r = rankProducts(candidates, persons, "all");
  return r.best[0]?.product ?? r.maybe[0]?.product ?? null;
}
