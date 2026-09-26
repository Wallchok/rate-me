"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { rankProducts, rankingTitle, resolveForWhom } from "@/lib/ranking";
import type { SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { ForWhomSwitch } from "@/components/for-whom-switch";
import { ProductRow } from "@/components/product-row";

export default function CategoryPage() {
  return (
    <Suspense>
      <CategoryScreen />
    </Suspense>
  );
}

function CategoryScreen() {
  const id = Number(useSearchParams().get("id"));
  const { data } = useStore();
  const category = data?.categories.find((c) => c.id === id);

  return (
    <>
      <PageHeader back title={category?.name ?? "Kategoria"} />
      <WithData>{(d) => (category ? <Ranking data={d} categoryId={id} /> : <NotFound />)}</WithData>
    </>
  );
}

function NotFound() {
  return <p className="px-4 py-16 text-center text-sm text-muted-foreground">Nie ma takiej kategorii</p>;
}

function Ranking({ data, categoryId }: { data: SyncData; categoryId: number }) {
  const { forWhom: stored } = useStore();
  const forWhom = resolveForWhom(stored, data.persons);
  const { ranked, avoid, untried } = useMemo(
    () => rankProducts(data.products.filter((p) => p.categoryId === categoryId), data.persons, forWhom),
    [data, categoryId, forWhom]
  );
  const personName = forWhom === "all" ? null : data.persons.find((p) => p.id === forWhom)?.name;

  return (
    <main className="space-y-5 px-4 pb-6">
      <ForWhomSwitch persons={data.persons} value={forWhom} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{rankingTitle(forWhom, data.persons)}</h2>
        {ranked.length === 0 && (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Brak produktów, które można śmiało kupić. Oceńcie coś z tej kategorii.
          </p>
        )}
        {ranked.map((item, i) => (
          <ProductRow key={item.product.id} product={item.product} persons={data.persons} rank={i + 1} />
        ))}
      </section>

      {untried.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {personName ? `Jeszcze nieocenione przez: ${personName}` : "Jeszcze nieocenione"}
          </h2>
          {untried.map((item) => (
            <ProductRow key={item.product.id} product={item.product} persons={data.persons} muted />
          ))}
        </section>
      )}

      {avoid.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Nie brać</h2>
          {avoid.map((item) => (
            <ProductRow key={item.product.id} product={item.product} persons={data.persons} muted />
          ))}
        </section>
      )}
    </main>
  );
}
