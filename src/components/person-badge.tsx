import { cn } from "@/lib/utils"
import { AVOID_UP_TO, LIKE_FROM } from "@/lib/ranking"
import type { Person, Product } from "@/lib/types"

const PERSON_COLORS = ["bg-violet-500", "bg-teal-500", "bg-orange-500", "bg-pink-500", "bg-sky-500"]

export function personColor(persons: Person[], personId: number) {
  const idx = persons.findIndex((p) => p.id === personId)
  return PERSON_COLORS[(idx < 0 ? 0 : idx) % PERSON_COLORS.length]
}

// -700 shades keep 4.5:1 contrast on the light background, readable in a bright shop
export function scoreTone(score: number) {
  if (score >= LIKE_FROM) return "text-emerald-700 dark:text-emerald-400"
  if (score > AVOID_UP_TO) return "text-amber-700 dark:text-amber-400"
  return "text-red-700 dark:text-red-400"
}

// One letter, or two when first letters clash: Maciej and Magda become "Mc" and "Mg"
export function initials(persons: Person[], person: Person) {
  const first = (p: Person) => p.name.trim().charAt(0).toUpperCase()
  const group = persons.filter((p) => first(p) === first(person))
  if (group.length < 2) return first(person)
  const maxLength = Math.max(...group.map((p) => p.name.trim().length))
  for (let k = 1; k < maxLength; k++) {
    const pick = (p: Person) => first(p) + (p.name.trim().charAt(k) || "").toLowerCase()
    if (new Set(group.map(pick)).size === group.length) return pick(person)
  }
  return first(person) + (group.findIndex((p) => p.id === person.id) + 1)
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
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-0.5 text-[10px] font-bold text-white",
        personColor(persons, person.id),
        className
      )}
      aria-hidden
    >
      {initials(persons, person)}
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
              <span className={scoreTone(r.score)} aria-hidden>
                {r.score}
              </span>
            ) : (
              <span className="text-muted-foreground font-normal" aria-hidden>
                -
              </span>
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
