"use client"

import { useMemo } from "react"
import { rankProducts, rankingTitle } from "@/lib/ranking"
import type { ForWhom } from "@/lib/store"
import type { Person, Product, SyncData } from "@/lib/types"
import { ProductRow } from "@/components/product-row"

function Section({
  title,
  tone,
  products,
  persons,
  numbered,
  muted,
  categoryName,
}: {
  title: string
  tone?: "bad"
  products: Product[]
  persons: Person[]
  numbered?: boolean
  muted?: boolean
  categoryName?: (p: Product) => string | undefined
}) {
  if (products.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className={tone === "bad" ? "text-sm font-semibold text-red-700 dark:text-red-400" : "text-sm font-semibold text-muted-foreground"}>
        {title}
      </h2>
      {products.map((p, i) => (
        <ProductRow
          key={p.id}
          product={p}
          persons={persons}
          rank={numbered ? i + 1 : undefined}
          muted={muted}
          categoryName={categoryName?.(p)}
        />
      ))}
    </section>
  )
}

// Products in buying order for the chosen person: best, fine, not rated yet, avoid
export function RankedList({
  data,
  products,
  forWhom,
  showCategory,
}: {
  data: SyncData
  products: Product[]
  forWhom: ForWhom
  showCategory: boolean
}) {
  const { best, maybe, untried, avoid } = useMemo(
    () => rankProducts(products, data.persons, forWhom),
    [products, data.persons, forWhom]
  )
  const names = useMemo(() => new Map(data.categories.map((c) => [c.id, c.name])), [data.categories])
  const categoryName = showCategory ? (p: Product) => names.get(p.categoryId) : undefined
  const personName = forWhom === "all" ? null : data.persons.find((p) => p.id === forWhom)?.name
  const pick = (items: { product: Product }[]) => items.map((i) => i.product)

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{rankingTitle(forWhom, data.persons)}</h2>
        {best.length === 0 ? (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Nie ma tu jeszcze nic ocenionego na 7 albo więcej.</p>
        ) : (
          best.map((item, i) => (
            <ProductRow
              key={item.product.id}
              product={item.product}
              persons={data.persons}
              rank={i + 1}
              categoryName={categoryName?.(item.product)}
            />
          ))
        )}
      </section>
      <Section title="Może być (5-6)" products={pick(maybe)} persons={data.persons} categoryName={categoryName} />
      <Section
        title={personName ? `Jeszcze nieocenione przez: ${personName}` : "Jeszcze nieocenione"}
        products={pick(untried)}
        persons={data.persons}
        muted
        categoryName={categoryName}
      />
      <Section title="Nie brać" tone="bad" products={pick(avoid)} persons={data.persons} muted categoryName={categoryName} />
    </div>
  )
}
