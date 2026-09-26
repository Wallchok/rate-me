"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { linkProduct, removeItem, setBought } from "@/lib/list";
import { LIKE_FROM, matchingProducts, ratingOf } from "@/lib/ranking";
import type { ListItem, Product, SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { PersonAvatar, scoreTone } from "@/components/person-badge";
import { ProductRow } from "@/components/product-row";
import { RankedList } from "@/components/ranked-list";
import { Button } from "@/components/ui/button";

export default function ListItemPage() {
  return (
    <Suspense>
      <Screen />
    </Suspense>
  );
}

function Screen() {
  const id = useSearchParams().get("id");
  const { data } = useStore();
  const item = data?.list.find((i) => i.id === id);
  return (
    <>
      <PageHeader back title={item?.text ?? "Pozycja listy"} />
      <WithData>
        {(d) =>
          item ? (
            <Details data={d} item={item} />
          ) : (
            <p className="px-4 py-16 text-center text-sm text-muted-foreground">Tej pozycji nie ma już na liście.</p>
          )
        }
      </WithData>
    </>
  );
}

function Details({ data, item }: { data: SyncData; item: ListItem }) {
  const router = useRouter();
  const product = item.productId ? data.products.find((p) => p.id === item.productId) : undefined;
  const categoryId = product?.categoryId ?? item.categoryId ?? null;
  const category = data.categories.find((c) => c.id === categoryId);
  const candidates = useMemo(
    () => matchingProducts(item.text, categoryId, data.products, data.categories),
    [item.text, categoryId, data.products, data.categories]
  );
  const addedBy = data.persons.find((p) => p.id === item.addedById);
  const boughtBy = data.persons.find((p) => p.id === item.boughtById);
  const done = Boolean(item.boughtAt);
  const time = (iso: string) => new Date(iso).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  // Each person's favourite among the matching products
  const favourites = data.persons.flatMap((person) => {
    const best = candidates
      .map((p) => ({ p, r: ratingOf(p, person.id) }))
      .filter((x) => x.r && x.r.score >= LIKE_FROM)
      .sort((a, b) => b.r!.score - a.r!.score)[0];
    return best ? [{ person, product: best.p, score: best.r!.score }] : [];
  });

  function pick(p: Product) {
    linkProduct(item, p);
    toast.success(`Na liście: ${p.name}`);
  }

  return (
    <main className="space-y-6 px-4 pb-6">
      <section className="space-y-3 rounded-2xl border p-4">
        <p className="text-sm text-muted-foreground">
          {addedBy && `Dodane: ${addedBy.name}, ${time(item.createdAt)}`}
          {done && boughtBy && item.boughtAt && ` · Kupione: ${boughtBy.name}, ${time(item.boughtAt)}`}
        </p>
        {category && <p className="text-sm">Kategoria: <span className="font-medium">{category.name}</span></p>}
        {product && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Wybrany produkt:</p>
            <ProductRow product={product} persons={data.persons} />
          </div>
        )}
        <div className="flex gap-2">
          <Button className="h-11 flex-1" variant={done ? "outline" : "default"} onClick={() => setBought(item, !done)}>
            <Check className="size-4" />
            {done ? "Cofnij kupione" : "Kupione"}
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              removeItem(item);
              router.replace("/list");
            }}
            aria-label="Usuń z listy"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </section>

      {favourites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Kto co lubi</h2>
          <div className="divide-y rounded-2xl border">
            {favourites.map((f) => (
              <div key={f.person.id} className="flex items-center gap-2 px-3 py-1.5">
                <PersonAvatar persons={data.persons} person={f.person} />
                <Link href={`/product?id=${f.product.id}`} className="min-w-0 flex-1 truncate py-2 text-sm">
                  <span className="font-medium">{f.person.name}:</span> {f.product.name}
                </Link>
                <span className={cn("font-semibold tabular-nums", scoreTone(f.score))}>{f.score}</span>
                {f.product.id !== product?.id && (
                  <button onClick={() => pick(f.product)} className="flex min-h-11 items-center gap-1 px-2 text-xs font-medium text-primary">
                    <Pin className="size-3.5" />
                    Wybieram
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {candidates.length > 0 ? (
        <RankedList data={data} products={candidates} forWhom="all" showCategory={!category} />
      ) : (
        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          Nie macie jeszcze ocenionych produktów pasujących do „{item.text}”. Po zakupie dodaj produkt i oceń go, a następnym razem pojawi się tu podpowiedź.
        </p>
      )}
    </main>
  );
}
