"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, CloudOff, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { addItem, clearBought, removeItem, setBought } from "@/lib/list";
import { bestMatch, inShoppingOrder, rankProducts } from "@/lib/ranking";
import { fold } from "@/lib/text";
import type { ListItem, SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { PersonAvatar, ScoreChips } from "@/components/person-badge";
import { ProductThumb } from "@/components/product-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ListPage() {
  return (
    <>
      <PageHeader title="Lista zakupów" />
      <WithData>{(d) => <ShoppingList data={d} />}</WithData>
    </>
  );
}

function ShoppingList({ data }: { data: SyncData }) {
  const { pending } = useStore();
  const [text, setText] = useState("");
  const toBuy = data.list.filter((i) => !i.boughtAt);
  const bought = data.list
    .filter((i) => i.boughtAt)
    .sort((a, b) => (b.boughtAt ?? "").localeCompare(a.boughtAt ?? ""));

  // While typing: your products that match, best for the household first
  const suggestions = useMemo(() => {
    const q = fold(text.trim());
    if (q.length < 2) return [];
    const categoryName = new Map(data.categories.map((c) => [c.id, fold(c.name)]));
    const found = data.products.filter(
      (p) => fold(p.name).includes(q) || (p.brand && fold(p.brand).includes(q)) || categoryName.get(p.categoryId)?.includes(q)
    );
    return inShoppingOrder(rankProducts(found, data.persons, "all"))
      .map((r) => r.product)
      .slice(0, 5);
  }, [text, data]);

  function add(value: string, productId: number | null) {
    const clean = value.trim();
    if (!clean) return;
    addItem(data, clean, productId);
    setText("");
  }

  return (
    <main className="space-y-5 px-4 pb-6">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(text, null);
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Co kupić? np. mleko"
          className="h-11"
          aria-label="Co kupić"
        />
        <Button type="submit" className="h-11 px-4" disabled={!text.trim()}>
          <Plus className="size-4" />
          Dodaj
        </Button>
      </form>

      {suggestions.length > 0 && (
        <section className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Z Waszych produktów:</p>
          {suggestions.map((p) => (
            <button
              key={p.id}
              onClick={() => add(p.name, p.id)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-2 text-left active:bg-muted"
            >
              <ProductThumb product={p} className="size-10 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <ScoreChips product={p} persons={data.persons} />
              </span>
              <Plus className="size-5 shrink-0 text-primary" />
            </button>
          ))}
        </section>
      )}

      {pending > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <CloudOff className="size-4" />
          Zmiany bez internetu: {pending}. Wyślą się same, gdy wróci zasięg.
        </p>
      )}

      {toBuy.length === 0 && bought.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Lista jest pusta. Dodaj coś powyżej albo na stronie produktu stuknij „Dodaj do listy”.
        </p>
      )}

      {toBuy.length > 0 && (
        <section className="divide-y rounded-2xl border bg-card">
          {toBuy.map((item) => (
            <Row key={item.id} item={item} data={data} />
          ))}
        </section>
      )}

      {bought.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Kupione ({bought.length})</h2>
            <button onClick={() => clearBought(data)} className="min-h-11 px-2 text-sm text-muted-foreground">
              Wyczyść kupione
            </button>
          </div>
          <div className="divide-y rounded-2xl border">
            {bought.map((item) => (
              <Row key={item.id} item={item} data={data} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Row({ item, data }: { item: ListItem; data: SyncData }) {
  const done = Boolean(item.boughtAt);
  const product = item.productId ? data.products.find((p) => p.id === item.productId) : undefined;
  // Written as plain text ("jogurt"): point at the best matching product you have rated
  const suggestion = !product && !done ? bestMatch(item.text, data.products, data.categories, data.persons, item.categoryId) : null;
  const addedBy = data.persons.find((p) => p.id === item.addedById);
  const boughtBy = data.persons.find((p) => p.id === item.boughtById);
  const time = item.boughtAt
    ? new Date(item.boughtAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className={cn("flex items-center gap-2 px-2 py-1.5", done && "opacity-60")}>
      <button
        onClick={() => setBought(item, !done)}
        aria-pressed={done}
        aria-label={done ? `${item.text}: kupione, cofnij` : `${item.text}: oznacz jako kupione`}
        className="flex size-11 shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full border-2",
            done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
          )}
        >
          {done && <Check className="size-4" />}
        </span>
      </button>
      <div className="min-w-0 flex-1 py-1">
        {/* Details: who likes what, what to buy */}
        <Link href={`/list/item?id=${item.id}`} className={cn("block truncate font-medium", done && "line-through")}>
          {item.text}
          {product?.brand && <span className="font-normal text-muted-foreground"> · {product.brand}</span>}
        </Link>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {done && boughtBy ? (
            <span>
              Kupione: {boughtBy.name}, {time}
            </span>
          ) : (
            addedBy && (
              <span className="flex items-center gap-1">
                <PersonAvatar persons={data.persons} person={addedBy} className="h-4 min-w-4 text-[9px]" />
                dodane
              </span>
            )
          )}
          {product && !done && <ScoreChips product={product} persons={data.persons} />}
        </div>
        {suggestion && (
          <Link
            href={`/product?id=${suggestion.id}`}
            className="mt-1 flex min-h-9 items-center gap-2 rounded-lg bg-primary/5 px-2 py-1 text-xs"
          >
            <span className="shrink-0 text-muted-foreground">Najlepszy u Was:</span>
            <span className="min-w-0 truncate font-medium">{suggestion.name}</span>
            <ScoreChips product={suggestion} persons={data.persons} />
          </Link>
        )}
      </div>
      {!done && (
        <button
          onClick={() => removeItem(item)}
          aria-label={`Usuń z listy: ${item.text}`}
          className="flex size-11 shrink-0 items-center justify-center text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
