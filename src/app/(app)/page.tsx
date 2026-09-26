"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanBarcode, Search, X } from "lucide-react";
import { toast } from "sonner";
import { setCategory, useStore, type CategoryFilter } from "@/lib/store";
import { normalizeEan } from "@/lib/ean";
import { inShoppingOrder, rankProducts, resolveForWhom } from "@/lib/ranking";
import { fold } from "@/lib/text";
import type { SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { ForWhomSwitch } from "@/components/for-whom-switch";
import { ProductRow } from "@/components/product-row";
import { RankedList } from "@/components/ranked-list";
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
  const { forWhom: stored, category: storedCategory } = useStore();
  const forWhom = resolveForWhom(stored, data.persons);
  const [query, setQuery] = useState("");

  // Only categories that have products, most used first
  const categories = useMemo(() => {
    const counts = new Map<number, number>();
    for (const p of data.products) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    return data.categories
      .filter((c) => counts.has(c.id))
      .map((c) => ({ ...c, count: counts.get(c.id)! }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pl"));
  }, [data]);
  const category = categories.some((c) => c.id === storedCategory) ? storedCategory : "all";

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

  const visible = useMemo(
    () => (category === "all" ? data.products : data.products.filter((p) => p.categoryId === category)),
    [data.products, category]
  );

  if (data.products.length === 0) {
    return (
      <main className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-lg font-semibold">Jeszcze nic nie oceniliście</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Dodaj produkt po zjedzeniu i oceń go. Tu pojawią się Wasi faworyci.
        </p>
        <Link href="/add" className={cn(buttonVariants(), "mt-2 h-11 px-5")}>
          Dodaj pierwszy produkt
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-4 pb-6">
      <div className="space-y-3 px-4">
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
              className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center text-muted-foreground"
              aria-label="Wyczyść"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {results ? (
        <div className="space-y-2 px-4">
          {results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nic nie znaleziono</p>}
          {results.map((p) => (
            <ProductRow key={p.id} product={p} persons={data.persons} categoryName={nameOf(data, p.categoryId)} />
          ))}
        </div>
      ) : (
        <>
          <CategoryChips categories={categories} value={category} total={data.products.length} />
          <div className="px-4">
            <RankedList data={data} products={visible} forWhom={forWhom} showCategory={category === "all"} />
          </div>
        </>
      )}
    </main>
  );
}

function nameOf(data: SyncData, categoryId: number) {
  return data.categories.find((c) => c.id === categoryId)?.name;
}

// Horizontally scrolling filter; the choice is remembered on this phone
function CategoryChips({
  categories,
  value,
  total,
}: {
  categories: { id: number; name: string; count: number }[];
  value: CategoryFilter;
  total: number;
}) {
  const chips: { key: CategoryFilter; label: string; count: number }[] = [
    { key: "all", label: "Wszystko", count: total },
    ...categories.map((c) => ({ key: c.id as CategoryFilter, label: c.name, count: c.count })),
  ];
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="radiogroup" aria-label="Kategoria">
      {chips.map((c) => (
        <button
          key={String(c.key)}
          role="radio"
          aria-checked={value === c.key}
          onClick={() => setCategory(c.key)}
          className={cn(
            "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
            value === c.key ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground active:bg-muted"
          )}
        >
          {c.label}
          <span className={cn("text-xs tabular-nums", value === c.key ? "opacity-80" : "text-muted-foreground")}>{c.count}</span>
        </button>
      ))}
    </div>
  );
}
