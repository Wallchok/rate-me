import { NextRequest, NextResponse } from "next/server";
import { getPersonId, unauthorized } from "@/lib/session";

const FIELDS = [
  "product_name_pl",
  "product_name",
  "brands",
  "image_front_url",
  "nutriscore_grade",
  "nutriments",
].join(",");

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

// Looks a barcode up in Open Food Facts (limit: 15 requests/min per IP, so only on explicit scan)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ ean: string }> }) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const { ean } = await params;
  if (!/^\d{8,14}$/.test(ean)) return NextResponse.json({ error: "Nieprawidłowy kod" }, { status: 400 });

  let res: Response;
  try {
    res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${ean}?fields=${FIELDS}`, {
      headers: { "User-Agent": "RateMe/1.0 (private household app)" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
  } catch {
    return NextResponse.json({ error: "Baza produktów nie odpowiada" }, { status: 502 });
  }

  if (res.status === 404) return NextResponse.json({ found: false });
  if (!res.ok) return NextResponse.json({ error: "Baza produktów nie odpowiada" }, { status: 502 });

  const json = await res.json().catch(() => null);
  if (!json) return NextResponse.json({ error: "Baza produktów nie odpowiada" }, { status: 502 });
  // OFF answers 200 with status 0 for unknown or invalid codes
  if (json.status !== 1 || !json.product) return NextResponse.json({ found: false });
  const p = json.product;
  const n = p.nutriments ?? {};
  const grade = typeof p.nutriscore_grade === "string" ? p.nutriscore_grade.toLowerCase() : null;

  return NextResponse.json({
    found: true,
    name: p.product_name_pl || p.product_name || null,
    brand: typeof p.brands === "string" ? p.brands.split(",")[0].trim() || null : null,
    imageUrl: typeof p.image_front_url === "string" && p.image_front_url.startsWith("https://")
      ? p.image_front_url
      : null,
    nutriScore: grade && /^[a-e]$/.test(grade) ? grade : null,
    calories: num(n["energy-kcal_100g"]),
    protein: num(n.proteins_100g),
    carbs: num(n.carbohydrates_100g),
    sugar: num(n.sugars_100g),
    fat: num(n.fat_100g),
  });
}
