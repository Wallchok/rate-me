"use client";

import { useMemo } from "react";
import { ratingOf } from "@/lib/ranking";
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
    // Includes products nobody has rated yet, e.g. added without a rating
    () => data.products.filter((p) => !ratingOf(p, data.meId)).sort(bestFirst),
    [data]
  );
  const forOthers = useMemo(
    () =>
      data.persons
        .filter((person) => person.id !== data.meId)
        .map((person) => ({
        person,
        products: data.products.filter((p) => p.ratings.length > 0 && !ratingOf(p, person.id)).sort(bestFirst),
      })),
    [data]
  );

  const empty = forMe.length === 0 && forOthers.every((o) => o.products.length === 0);

  return (
    <main className="space-y-6 px-4 pb-6">
      {empty && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Wszystko, co macie w bazie, zostało ocenione przez wszystkich.
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
