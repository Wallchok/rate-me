import { NextRequest, NextResponse } from "next/server";
import { getPersonId, unauthorized } from "@/lib/session";
import type { OffSearchHit } from "@/lib/types";

const FIELDS = ["code", "product_name", "brands", "quantity", "image_front_small_url"].join(",");

// Lowercase without Polish diacritics, so "piatnica" matches "Piątnica"
function fold(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ł/g, "l");
}

// Searches Polish products in Open Food Facts by name; full data is fetched per barcode after picking one
export async function GET(request: NextRequest) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ hits: [] });

  // Quotes would break the query syntax of the search service
  const query = `${q.replace(/["\\]/g, " ")} countries_tags:"en:poland"`;
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=40&fields=${FIELDS}`;

  let json: { hits?: Record<string, unknown>[] } | null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "RateMe/1.0 (private household app)" },
      signal: AbortSignal.timeout(8000),
    });
    json = res.ok ? await res.json().catch(() => null) : null;
  } catch {
    json = null;
  }
  if (!json) return NextResponse.json({ error: "Baza produktów nie odpowiada" }, { status: 502 });

  const hits: OffSearchHit[] = (json.hits ?? [])
    .map((h) => {
      const brands = Array.isArray(h.brands) ? h.brands : typeof h.brands === "string" ? h.brands.split(",") : [];
      const thumb = typeof h.image_front_small_url === "string" ? h.image_front_small_url : null;
      return {
        ean: typeof h.code === "string" ? h.code : "",
        name: typeof h.product_name === "string" ? h.product_name.trim() : "",
        brand: typeof brands[0] === "string" ? brands[0].trim() || null : null,
        quantity: typeof h.quantity === "string" ? h.quantity : null,
        thumbUrl: thumb?.startsWith("https://") ? thumb : null,
      };
    })
    // Products without a name or a valid barcode cannot be added anyway
    .filter((h) => h.name && /^\d{8,14}$/.test(h.ean));

  // The service matches any of the words, so put products matching all of them first
  const words = fold(q).split(/\s+/).filter(Boolean);
  const matched = (h: OffSearchHit) => {
    const text = fold(`${h.name} ${h.brand ?? ""}`);
    return words.filter((w) => text.includes(w)).length;
  };
  const ranked = hits
    .map((hit, index) => ({ hit, index, score: matched(hit) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 20)
    .map(({ hit }) => hit);

  return NextResponse.json({ hits: ranked });
}
