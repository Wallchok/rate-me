import { cn } from "@/lib/utils"
import { AVOID_UP_TO, LIKE_FROM } from "@/lib/ranking"
import type { Person, Product } from "@/lib/types"

const PERSON_COLORS = ["bg-violet-500", "bg-teal-500", "bg-orange-500", "bg-pink-500", "bg-sky-500"]

export function personColor(persons: Person[], personId: number) {
  const idx = persons.findIndex((p) => p.id === personId)
  return PERSON_COLORS[(idx < 0 ? 0 : idx) % PERSON_COLORS.length]
}

export function scoreTone(score: number) {
  if (score >= LIKE_FROM) return "text-emerald-600 dark:text-emerald-400"
  if (score > AVOID_UP_TO) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

export function scoreBg(score: number) {
  if (score >= LIKE_FROM) return "bg-emerald-500/10"
  if (score > AVOID_UP_TO) return "bg-amber-500/10"
  return "bg-red-500/10"
}

export function PersonAvatar({
  persons,
  person,
  className,
}: {
  persons: Person[]
  person: Person
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
        personColor(persons, person.id),
        className
      )}
      aria-hidden
    >
      {person.name.charAt(0).toUpperCase()}
    </span>
  )
}

// Every household member's score next to each other, e.g. [A] 9  [T] 7
export function ScoreChips({ product, persons }: { product: Product; persons: Person[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {persons.map((person) => {
        const r = product.ratings.find((rating) => rating.personId === person.id)
        return (
          <span
            key={person.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-sm font-semibold tabular-nums",
              r ? scoreBg(r.score) : "bg-muted"
            )}
            title={person.name}
          >
            <PersonAvatar persons={persons} person={person} />
            {r ? (
              <span className={scoreTone(r.score)}>{r.score}</span>
            ) : (
              <span className="text-muted-foreground font-normal">-</span>
            )}
            <span className="sr-only">
              {person.name}: {r ? r.score : "brak oceny"}
            </span>
          </span>
        )
      })}
    </div>
  )
}
