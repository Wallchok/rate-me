"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  ImageIcon,
  Trophy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  imageUrl: string | null;
  price: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  category: { id: number; name: string };
  store: { id: number; name: string } | null;
  ratings: { score: number; person: { name: string } }[];
}

function getAvg(ratings: { score: number }[]): number | null {
  if (ratings.length === 0) return null;
  return (
    Math.round(
      (ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10
    ) / 10
  );
}

function getRatingColor(score: number) {
  if (score >= 8) return "text-emerald-500";
  if (score >= 5) return "text-amber-500";
  return "text-red-500";
}

function getRatingBg(score: number) {
  if (score >= 8) return "bg-emerald-500/10";
  if (score >= 5) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const idsParam = searchParams.get("ids");
    if (!idsParam) {
      router.push("/");
      return;
    }

    const ids = idsParam.split(",").map(Number).filter(Boolean);
    if (ids.length < 2) {
      router.push("/");
      return;
    }

    Promise.all(
      ids.map((id) =>
        fetch(`/api/products/${id}`).then((r) => (r.ok ? r.json() : null))
      )
    ).then((results) => {
      setProducts(results.filter(Boolean));
      setLoading(false);
    });
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  const ratings = products.map((p) => getAvg(p.ratings));
  const bestRatingIdx = ratings.reduce<number>(
    (best, val, idx) =>
      val !== null && (best === -1 || (ratings[best as number] ?? 0) < val) ? idx : best,
    -1
  );
  const prices = products.map((p) => p.price);
  const bestPriceIdx = prices.reduce<number>(
    (best, val, idx) =>
      val !== null && (best === -1 || (prices[best as number] ?? Infinity) > val)
        ? idx
        : best,
    -1
  );

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            aria-label="Wróć"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="font-semibold">Porównanie produktów</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        {/* Mobile: vertical cards / Desktop: table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="w-32 sm:w-40" />
                {products.map((p, idx) => (
                  <th
                    key={p.id}
                    className="p-2 text-center align-top"
                    style={{ width: `${100 / (products.length + 1)}%` }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="size-24 sm:size-32 rounded-xl object-contain bg-muted/30 shadow-sm"
                          />
                        ) : (
                          <div className="flex size-24 sm:size-32 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/50">
                            <ImageIcon className="size-8 text-muted-foreground/25" />
                          </div>
                        )}
                        {idx === bestRatingIdx && ratings[idx] !== null && (
                          <div className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-amber-400 text-amber-900 shadow-sm">
                            <Trophy className="size-3.5" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-sm leading-snug text-center line-clamp-2">
                        {p.name}
                      </p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Ocena */}
              <tr>
                <td className="py-3 px-2 text-sm font-medium text-muted-foreground">
                  Ocena
                </td>
                {products.map((p, idx) => {
                  const avg = ratings[idx];
                  return (
                    <td key={p.id} className="py-3 px-2 text-center">
                      {avg !== null ? (
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={cn(
                              "flex items-center gap-1 rounded-lg px-2.5 py-1",
                              getRatingBg(avg)
                            )}
                          >
                            <Star
                              className={cn(
                                "size-4 fill-current",
                                getRatingColor(avg)
                              )}
                            />
                            <span
                              className={cn(
                                "text-lg font-bold",
                                getRatingColor(avg)
                              )}
                            >
                              {avg}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {p.ratings.length}{" "}
                            {p.ratings.length === 1
                              ? "ocena"
                              : p.ratings.length < 5
                                ? "oceny"
                                : "ocen"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Cena */}
              <tr>
                <td className="py-3 px-2 text-sm font-medium text-muted-foreground">
                  Cena
                </td>
                {products.map((p, idx) => (
                  <td key={p.id} className="py-3 px-2 text-center">
                    {p.price !== null ? (
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          idx === bestPriceIdx && "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {p.price.toFixed(2)} zł
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Kategoria */}
              <tr>
                <td className="py-3 px-2 text-sm font-medium text-muted-foreground">
                  Kategoria
                </td>
                {products.map((p) => (
                  <td key={p.id} className="py-3 px-2 text-center">
                    <Badge variant="secondary" className="text-xs">
                      {p.category.name}
                    </Badge>
                  </td>
                ))}
              </tr>

              {/* Sklep */}
              <tr>
                <td className="py-3 px-2 text-sm font-medium text-muted-foreground">
                  Sklep
                </td>
                {products.map((p) => (
                  <td key={p.id} className="py-3 px-2 text-center">
                    <span className="text-sm">
                      {p.store?.name ?? "Wszędzie"}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Kalorie */}
              {products.some((p) => p.calories !== null) && (
                <tr>
                  <td className="py-3 px-2 text-sm font-medium text-muted-foreground">
                    Kalorie
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="py-3 px-2 text-center text-sm">
                      {p.calories !== null ? `${p.calories} kcal` : "—"}
                    </td>
                  ))}
                </tr>
              )}

              {/* Białko */}
              {products.some((p) => p.protein !== null) && (
                <tr>
                  <td className="py-3 px-2 text-sm font-medium text-muted-foreground">
                    Białko
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="py-3 px-2 text-center text-sm">
                      {p.protein !== null ? `${p.protein}g` : "—"}
                    </td>
                  ))}
                </tr>
              )}

              {/* Węglowodany */}
              {products.some((p) => p.carbs !== null) && (
                <tr>
                  <td className="py-3 px-2 text-sm font-medium text-muted-foreground">
                    Węglowodany
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="py-3 px-2 text-center text-sm">
                      {p.carbs !== null ? `${p.carbs}g` : "—"}
                    </td>
                  ))}
                </tr>
              )}

              {/* Tłuszcz */}
              {products.some((p) => p.fat !== null) && (
                <tr>
                  <td className="py-3 px-2 text-sm font-medium text-muted-foreground">
                    Tłuszcz
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="py-3 px-2 text-center text-sm">
                      {p.fat !== null ? `${p.fat}g` : "—"}
                    </td>
                  ))}
                </tr>
              )}

              {/* Oceny per osoba */}
              {(() => {
                const allPersons = new Map<string, Map<number, number>>();
                products.forEach((p) => {
                  p.ratings.forEach((r) => {
                    if (!allPersons.has(r.person.name)) {
                      allPersons.set(r.person.name, new Map());
                    }
                    allPersons.get(r.person.name)!.set(p.id, r.score);
                  });
                });

                if (allPersons.size === 0) return null;

                return (
                  <>
                    <tr>
                      <td
                        colSpan={products.length + 1}
                        className="pt-4 pb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Oceny poszczególnych osób
                      </td>
                    </tr>
                    {Array.from(allPersons.entries()).map(([name, scores]) => (
                      <tr key={name}>
                        <td className="py-2 px-2 text-sm text-muted-foreground">
                          {name}
                        </td>
                        {products.map((p) => {
                          const score = scores.get(p.id);
                          return (
                            <td
                              key={p.id}
                              className="py-2 px-2 text-center"
                            >
                              {score !== undefined ? (
                                <span
                                  className={cn(
                                    "text-sm font-semibold",
                                    getRatingColor(score)
                                  )}
                                >
                                  {score}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
