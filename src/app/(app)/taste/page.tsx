"use client";

import { useMemo } from "react";
import Link from "next/link";
import { tasteStats, type PairStats } from "@/lib/taste";
import type { SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { PersonAvatar, scoreTone } from "@/components/person-badge";
import { ProductRow } from "@/components/product-row";
import { cn } from "@/lib/utils";

export default function TastePage() {
  return (
    <>
      <PageHeader back title="Gusty" />
      <WithData>{(d) => <Taste data={d} />}</WithData>
    </>
  );
}

function Taste({ data }: { data: SyncData }) {
  const stats = useMemo(() => tasteStats(data), [data]);

  if (data.persons.length < 2) {
    return <p className="px-4 py-16 text-center text-sm text-muted-foreground">Porównanie gustów pojawi się, gdy dołączy druga osoba.</p>;
  }

  return (
    <main className="space-y-6 px-4 pb-6">
      {stats.pairs.map((p) => (
        <Pair key={`${p.a.id}-${p.b.id}`} pair={p} data={data} />
      ))}

      {stats.favouriteCategory.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Ulubione kategorie</h2>
          <div className="divide-y rounded-2xl border">
            {stats.favouriteCategory.map((f) => (
              <div key={f.person.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <PersonAvatar persons={data.persons} person={f.person} />
                <span className="font-medium">{f.person.name}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{f.category}</span>
                <span className={cn("font-semibold tabular-nums", scoreTone(f.avg))}>{f.avg.toLocaleString("pl-PL")}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Odkrycia ostatnich 30 dni</h2>
        {stats.discoveries.length === 0 ? (
          <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Nic nowego na 8 i więcej. Czas czegoś spróbować.</p>
        ) : (
          stats.discoveries.map((p) => <ProductRow key={p.id} product={p} persons={data.persons} />)
        )}
      </section>
    </main>
  );
}

function Pair({ pair, data }: { pair: PairStats; data: SyncData }) {
  const { a, b } = pair;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
        <div className="flex -space-x-1">
          <PersonAvatar persons={data.persons} person={a} className="size-9 text-sm ring-2 ring-card" />
          <PersonAvatar persons={data.persons} person={b} className="size-9 text-sm ring-2 ring-card" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {a.name} i {b.name}
          </p>
          {pair.agreement === null ? (
            <p className="text-sm">Oceńcie wspólnie kilka produktów, żeby zobaczyć zgodność.</p>
          ) : (
            <p className="text-2xl font-bold tabular-nums">
              {pair.agreement}% <span className="text-sm font-normal text-muted-foreground">zgodności</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">Wspólnie ocenione: {pair.shared}</p>
        </div>
      </div>

      {pair.bothLove.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Wspólni faworyci</h2>
          {pair.bothLove.map((p) => (
            <ProductRow key={p.id} product={p} persons={data.persons} />
          ))}
        </div>
      )}

      {pair.differences.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Tu się różnicie najbardziej</h2>
          <div className="divide-y rounded-2xl border">
            {pair.differences.map((d) => (
              <Link key={d.product.id} href={`/product?id=${d.product.id}`} className="flex items-center gap-3 px-3 py-2.5 text-sm active:bg-muted">
                <span className="min-w-0 flex-1 truncate font-medium">{d.product.name}</span>
                <span className="flex items-center gap-1">
                  <PersonAvatar persons={data.persons} person={a} />
                  <span className={cn("w-5 font-semibold tabular-nums", scoreTone(d.scoreA))}>{d.scoreA}</span>
                </span>
                <span className="flex items-center gap-1">
                  <PersonAvatar persons={data.persons} person={b} />
                  <span className={cn("w-5 font-semibold tabular-nums", scoreTone(d.scoreB))}>{d.scoreB}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
