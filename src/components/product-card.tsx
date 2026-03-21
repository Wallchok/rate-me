"use client"

import Link from "next/link"
import { Star, Store, Tag, ImageIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ProductCardProps {
  product: {
    id: number
    name: string
    imageUrl: string | null
    price: number | null
    category: { id: number; name: string }
    store: { id: number; name: string } | null
    ratings: { score: number }[]
  }
}

function getAvgRating(ratings: { score: number }[]): number | null {
  if (ratings.length === 0) return null
  const sum = ratings.reduce((acc, r) => acc + r.score, 0)
  return Math.round((sum / ratings.length) * 10) / 10
}

function getRatingColor(avg: number) {
  if (avg >= 8) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20"
  if (avg >= 5) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-amber-500/20"
  return "bg-red-500/15 text-red-700 dark:text-red-400 ring-red-500/20"
}

function getCategoryColor(name: string) {
  const colors = [
    "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    "bg-pink-500/10 text-pink-700 dark:text-pink-400",
    "bg-teal-500/10 text-teal-700 dark:text-teal-400",
    "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function ProductCard({ product }: ProductCardProps) {
  const avg = getAvgRating(product.ratings)

  return (
    <Link href={`/products/${product.id}`} className="group">
      <Card className="overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-ring/10">
        <div className="relative">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <ImageIcon className="size-10 text-muted-foreground/25" />
            </div>
          )}

          {avg !== null && (
            <div
              className={cn(
                "absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ring-1 backdrop-blur-sm",
                getRatingColor(avg)
              )}
            >
              <Star className="size-3 fill-current" />
              {avg}
            </div>
          )}
        </div>

        <CardContent className="space-y-2.5 p-3.5">
          <h3 className="font-semibold leading-snug line-clamp-2">{product.name}</h3>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className={cn("border-0 text-[0.7rem]", getCategoryColor(product.category.name))}>
              <Tag className="size-2.5" />
              {product.category.name}
            </Badge>
            {product.store && (
              <Badge variant="outline" className="text-[0.7rem]">
                <Store className="size-2.5" />
                {product.store.name}
              </Badge>
            )}
          </div>

          {product.price !== null && (
            <p className="text-sm font-medium text-muted-foreground">
              {product.price.toFixed(2)} zł
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
