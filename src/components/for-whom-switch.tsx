"use client"

import { cn } from "@/lib/utils"
import { setForWhom, type ForWhom } from "@/lib/store"
import type { Person } from "@/lib/types"

// "Buying for": both of us, or one person
export function ForWhomSwitch({ persons, value }: { persons: Person[]; value: ForWhom }) {
  if (persons.length < 2) return null
  const options: { key: ForWhom; label: string }[] = [
    { key: "all", label: "Razem" },
    ...persons.map((p) => ({ key: p.id as ForWhom, label: p.name })),
  ]
  return (
    <div className="flex gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Dla kogo kupujesz">
      {options.map((o) => (
        <button
          key={String(o.key)}
          role="radio"
          aria-checked={value === o.key}
          onClick={() => setForWhom(o.key)}
          className={cn(
            "min-h-11 flex-1 truncate rounded-lg px-2 text-sm font-medium transition-colors",
            value === o.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
