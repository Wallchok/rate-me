"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, HeartHandshake } from "lucide-react";
import { hasSkipped, ratingOf } from "@/lib/ranking";
import type { Product, SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { ProductRow } from "@/components/product-row";

export default function TryPage() {
  return (
    <>
      <PageHeader title="Do spróbowania" />
      <WithData>{(d) => <TryLists data={d} />}</WithData>
    </>
  );
}

const bestFirst = (a: Product, b: Product) => maxScore(b) - maxScore(a);
const maxScore = (p: Product) => Math.max(0, ...p.ratings.map((r) => r.score));

// Products only part of the household has rated: "taste it and rate it"
function TryLists({ data }: { data: SyncData }) {
  const forMe = useMemo(
    // Includes products nobody has rated yet, e.g. added without a rating; not the ones you skip
    () => data.products.filter((p) => !ratingOf(p, data.meId) && !hasSkipped(p, data.meId)).sort(bestFirst),
    [data]
  );
  const forOthers = useMemo(
    () =>
      data.persons
        .filter((person) => person.id !== data.meId)
        .map((person) => ({
        person,
        products: data.products
          .filter((p) => p.ratings.length > 0 && !ratingOf(p, person.id) && !hasSkipped(p, person.id))
          .sort(bestFirst),
      })),
    [data]
  );

  const empty = forMe.length === 0 && forOthers.every((o) => o.products.length === 0);

  return (
    <main className="space-y-6 px-4 pb-6">
      {data.persons.length > 1 && (
        <Link href="/taste" className="flex min-h-14 items-center gap-3 rounded-2xl border bg-primary/5 px-4 active:bg-muted">
          <HeartHandshake className="size-5 text-primary" />
          <span className="flex-1">
            <span className="block font-medium">Gusty</span>
            <span className="text-xs text-muted-foreground">Na ile się zgadzacie, w czym się różnicie</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}
      {empty && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {data.products.length === 0
            ? "Nie macie jeszcze żadnych produktów. Dodaj pierwszy przyciskiem „Dodaj”."
            : "Nic nie czeka na ocenę."}
        </p>
      )}

      {forMe.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Czekają na Twoją ocenę</h2>
          {forMe.map((p) => (
            <ProductRow key={p.id} product={p} persons={data.persons} />
          ))}
        </section>
      )}

      {forOthers.map(
        ({ person, products }) =>
          products.length > 0 && (
            <section key={person.id} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Czekają na: {person.name}</h2>
              {products.map((p) => (
                <ProductRow key={p.id} product={p} persons={data.persons} />
              ))}
            </section>
          )
      )}
    </main>
  );
}
