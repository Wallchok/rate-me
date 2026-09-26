"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ImageIcon, Loader2, Search } from "lucide-react"
import { normalizeEan } from "@/lib/ean"
import type { OffSearchHit, Product } from "@/lib/types"
import { Input } from "@/components/ui/input"

type Result =
  | { status: "idle" | "loading" }
  | { status: "done"; hits: OffSearchHit[] }
  | { status: "error"; message: string }

// Search Polish products in Open Food Facts by name and pick one to add to the household list
export function CatalogSearch({ products, onPick }: { products: Product[]; onPick: (ean: string) => void }) {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<Result>({ status: "idle" })
  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < 2) return
    const controller = new AbortController()
    // Wait until typing stops, the search service has a request limit
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/off/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || "Wyszukiwarka nie odpowiada")
        setResult({ status: "done", hits: json.hits ?? [] })
      } catch (e) {
        if (controller.signal.aborted) return
        const offline = e instanceof TypeError
        setResult({
          status: "error",
          message: offline ? "Wyszukiwanie działa tylko z internetem." : (e as Error).message,
        })
      }
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed])

  function onChange(value: string) {
    setQuery(value)
    setResult({ status: value.trim().length >= 2 ? "loading" : "idle" })
  }

  const known = (ean: string) => products.find((p) => p.ean === normalizeEan(ean))

  return (
    // min-w-0: long product names must truncate instead of widening the page
    <div className="min-w-0 space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Szukaj w bazie produktów, np. skyr"
          className="h-11 pl-9"
          aria-label="Szukaj w bazie produktów"
        />
      </div>

      {result.status === "loading" && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}
      {result.status === "error" && <p className="rounded-xl bg-muted p-3 text-sm">{result.message}</p>}
      {result.status === "done" && result.hits.length === 0 && (
        <p className="rounded-xl bg-muted p-3 text-sm">Nic nie znaleziono. Dodaj produkt skanem albo ręcznie.</p>
      )}

      {result.status === "done" && result.hits.length > 0 && (
        <ul className="divide-y rounded-2xl border">
          {result.hits.map((hit) => {
            const existing = known(hit.ean)
            return (
              <li key={hit.ean}>
                <div className="flex items-center gap-3 p-2.5">
                  {hit.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Open Food Facts thumbnail
                    <img src={hit.thumbUrl} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg bg-white object-contain" />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <ImageIcon className="size-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{hit.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[hit.brand, hit.quantity].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {existing ? (
                    <Link
                      href={`/product?id=${existing.id}`}
                      className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-primary active:bg-muted"
                    >
                      Macie
                    </Link>
                  ) : (
                    <button
                      onClick={() => onPick(hit.ean)}
                      className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground active:opacity-80"
                    >
                      Dodaj
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
