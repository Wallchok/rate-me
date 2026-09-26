import { parseId } from "@/lib/http";
import { normalizeEan } from "@/lib/ean";

// Parses product fields sent by the add/edit form. Returns an error message or clean data.
export interface ProductInput {
  name: string;
  brand: string | null;
  ean: string | null;
  categoryId?: number;
  newCategory?: string;
  imageUrl: string | null;
  nutriScore: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  sugar: number | null;
  fat: number | null;
}

function optionalText(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function optionalNumber(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" && !(typeof value === "string" && /^\s*\d+([.,]\d+)?\s*$/.test(value))) {
    return "invalid";
  }
  const n = Number(typeof value === "string" ? value.replace(",", ".") : value);
  if (!Number.isFinite(n) || n < 0 || n > 10000) return "invalid";
  return n;
}

export function parseProductInput(body: Record<string, unknown>): ProductInput | string {
  const name = optionalText(body.name);
  if (!name) return "Podaj nazwę produktu";

  const newCategory = optionalText(body.newCategory, 60) ?? undefined;
  const categoryId = parseId(body.categoryId);
  if (!newCategory && !categoryId) return "Wybierz kategorię";

  // Validate before trimming to length, so a 15-digit code is rejected, not cut
  const rawEan = optionalText(body.ean, 100);
  if (rawEan && !/^\d{8,14}$/.test(rawEan)) return "Kod kreskowy ma mieć 8-14 cyfr";
  const ean = rawEan ? normalizeEan(rawEan) : null;

  const imageUrl = optionalText(body.imageUrl, 2000);
  if (imageUrl && !/^(https:\/\/|\/uploads\/)/.test(imageUrl)) return "Nieprawidłowy adres zdjęcia";

  const nutriScore = optionalText(body.nutriScore, 100)?.toLowerCase() ?? null;
  if (nutriScore && !/^[a-e]$/.test(nutriScore)) return "Nieprawidłowy Nutri-Score";

  const numbers = {
    calories: optionalNumber(body.calories),
    protein: optionalNumber(body.protein),
    carbs: optionalNumber(body.carbs),
    sugar: optionalNumber(body.sugar),
    fat: optionalNumber(body.fat),
  };
  if (Object.values(numbers).includes("invalid")) return "Nieprawidłowe wartości odżywcze";

  return {
    name,
    brand: optionalText(body.brand, 100),
    ean,
    categoryId: newCategory ? undefined : (categoryId ?? undefined),
    newCategory,
    imageUrl,
    nutriScore,
    ...(numbers as Record<keyof typeof numbers, number | null>),
  };
}

export function parseRatingInput(body: Record<string, unknown>) {
  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 1 || score > 10) return "Ocena musi być od 1 do 10";
  return {
    score,
    note: optionalText(body.note, 1000),
  };
}
