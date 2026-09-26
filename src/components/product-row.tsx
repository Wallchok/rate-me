import Link from "next/link"
import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { verdict } from "@/lib/ranking"
import type { Person, Product } from "@/lib/types"
import { ScoreChips } from "@/components/person-badge"

export function ProductThumb({ product, className }: { product: Product; className?: string }) {
  if (!product.imageUrl) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg bg-muted", className)}>
        <ImageIcon className="size-5 text-muted-foreground/40" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- images come from Blob/OFF, next/image would need remote config and does not work offline
    <img
      src={product.imageUrl}
      alt=""
      loading="lazy"
      className={cn("rounded-lg bg-white object-contain", className)}
    />
  )
}

export function ProductRow({
  product,
  persons,
  rank,
  muted,
}: {
  product: Product
  persons: Person[]
  rank?: number
  muted?: boolean
}) {
  const v = verdict(product, persons)
  return (
    <Link
      href={`/product?id=${product.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-2.5 transition-colors active:bg-muted",
        muted && "opacity-70"
      )}
    >
      {rank !== undefined && (
        <span
          className={cn(
            "w-5 shrink-0 text-center text-sm font-bold tabular-nums",
            rank === 1 ? "text-amber-500" : "text-muted-foreground"
          )}
        >
          {rank}
        </span>
      )}
      <ProductThumb product={product} className="size-14 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium leading-tight">{product.name}</p>
        {product.brand && <p className="truncate text-xs text-muted-foreground">{product.brand}</p>}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <ScoreChips product={product} persons={persons} />
          <span
            className={cn(
              "text-xs",
              v.tone === "good" && "font-medium text-emerald-600 dark:text-emerald-400",
              v.tone === "bad" && "font-medium text-red-600 dark:text-red-400",
              v.tone === "neutral" && "text-muted-foreground"
            )}
          >
            {v.text}
          </span>
        </div>
      </div>
    </Link>
  )
}
