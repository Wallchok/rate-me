"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ScanBarcode, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { normalizeEan } from "@/lib/ean";
import { inShoppingOrder, rankProducts, resolveForWhom } from "@/lib/ranking";
import { fold } from "@/lib/text";
import type { ForWhom } from "@/lib/store";
import type { SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { ForWhomSwitch } from "@/components/for-whom-switch";
import { ProductRow, ProductThumb } from "@/components/product-row";
import { ScoreChips } from "@/components/person-badge";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { data } = useStore();
  const [scanOpen, setScanOpen] = useState(false);

  // In the shop: scan a product from the shelf to see if we know it
  function onScan(ean: string) {
    setScanOpen(false);
    const product = data?.products.find((p) => p.ean === ean);
    if (product) {
      router.push(`/product?id=${product.id}`);
    } else {
      toast("Nie znamy jeszcze tego produktu", { description: "Możesz go od razu dodać." });
      router.push(`/add?ean=${ean}`);
    }
  }

  return (
    <>
      <PageHeader
        title="Co kupić?"
        actions={
          <Button variant="ghost" size="icon" className="size-11" onClick={() => setScanOpen(true)} aria-label="Skanuj produkt">
            <ScanBarcode className="size-5" />
          </Button>
        }
      />
      <WithData>{(d) => <Home data={d} />}</WithData>
      <BarcodeScanner open={scanOpen} onOpenChange={setScanOpen} onDetected={onScan} />
    </>
  );
}

function Home({ data }: { data: SyncData }) {
  const { forWhom: stored } = useStore();
  const forWhom = resolveForWhom(stored, data.persons);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return null;
    const categoryName = new Map(data.categories.map((c) => [c.id, fold(c.name)]));
    const found = data.products.filter(
      (p) =>
        fold(p.name).includes(q) ||
        (p.brand && fold(p.brand).includes(q)) ||
        categoryName.get(p.categoryId)?.includes(q) ||
        (/^\d{8,14}$/.test(q) && p.ean === normalizeEan(q))
    );
    // Best to buy first, for whoever is selected in the switch; skipped ones at the end
    const ordered = inShoppingOrder(rankProducts(found, data.persons, forWhom)).map((r) => r.product);
    return [...ordered, ...found.filter((p) => !ordered.includes(p))];
  }, [query, data, forWhom]);

  return (
    <main className="space-y-4 px-4 pb-6">
      <ForWhomSwitch persons={data.persons} value={forWhom} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj produktu lub marki"
          className="h-11 pl-9"
          type="search"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground"
            aria-label="Wyczyść"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {results ? (
        <div className="space-y-2">
          {results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nic nie znaleziono</p>}
          {results.map((p) => (
            <ProductRow key={p.id} product={p} persons={data.persons} />
          ))}
        </div>
      ) : (
        <CategoryList data={data} forWhom={forWhom} />
      )}
    </main>
  );
}

function CategoryList({ data, forWhom }: { data: SyncData; forWhom: ForWhom }) {
  const groups = useMemo(
    () =>
      data.categories
        .map((category) => {
          const products = data.products.filter((p) => p.categoryId === category.id);
          return { category, count: products.length, ranking: rankProducts(products, data.persons, forWhom) };
        })
        .filter((g) => g.count > 0)
        .sort((a, b) => b.count - a.count || a.category.name.localeCompare(b.category.name, "pl")),
    [data, forWhom]
  );

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-lg font-semibold">Jeszcze nic nie oceniliście</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Dodaj produkt po zjedzeniu i oceń go. Tu pojawią się Wasi faworyci w każdej kategorii.
        </p>
        <Link href="/add" className={cn(buttonVariants(), "mt-2 h-11 px-5")}>
          Dodaj pierwszy produkt
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map(({ category, count, ranking }) => {
        const top = ranking.best[0] ?? ranking.maybe[0];
        const best = top?.product;
        const onlyMaybe = !ranking.best.length;
        const avoidNames = ranking.avoid.map((r) => r.product.name);
        return (
          <Link
            key={category.id}
            href={`/category?id=${category.id}`}
            className="block rounded-2xl border bg-card p-3 transition-colors active:bg-muted"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{category.name}</span>
              <span className="flex items-center text-xs text-muted-foreground">
                {count}
                <ChevronRight className="size-4" />
              </span>
            </div>
            {best ? (
              <div className="flex items-center gap-3">
                <ProductThumb product={best} className="size-12 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">
                    {onlyMaybe ? (
                      <span className="mr-1 text-muted-foreground">Może być:</span>
                    ) : (
                      <span className="mr-1 text-amber-500">★</span>
                    )}
                    {best.name}
                  </p>
                  <ScoreChips product={best} persons={data.persons} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {ranking.avoid.length > 0 ? "Nic tu jeszcze nie przypadło do gustu" : "Czeka na ocenę"}
              </p>
            )}
            {avoidNames.length > 0 && (best || avoidNames.length > 1) && (
              <p className="mt-2 truncate text-xs font-medium text-red-700 dark:text-red-400">
                Nie brać: {avoidNames.slice(0, 2).join(", ")}
                {avoidNames.length > 2 && ` i ${avoidNames.length - 2} więcej`}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
