"use client"

import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { mutateOptimistic } from "@/lib/store"
import type { Rating, SyncData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { scoreBg, scoreTone } from "@/components/person-badge"

const LABELS: Record<number, string> = {
  1: "Tragiczny",
  2: "Bardzo słaby",
  3: "Słaby",
  4: "Nie dla mnie",
  5: "Może być",
  6: "Niezły",
  7: "Dobry",
  8: "Bardzo dobry",
  9: "Świetny",
  10: "Idealny",
}

export interface RatingValue {
  score: number | null
  note: string
}

function ScoreButtons({ value, onPick }: { value: number | null; onPick: (n: number) => void }) {
  return (
    <>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            aria-pressed={value === n}
            aria-label={`${n}: ${LABELS[n]}`}
            className={cn(
              "h-12 rounded-xl text-lg font-bold tabular-nums transition-all",
              value === n
                ? cn(scoreBg(n), scoreTone(n), "ring-2 ring-current")
                : "bg-muted text-muted-foreground active:bg-muted/60"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className={cn("h-5 text-center text-sm font-medium", value && scoreTone(value))}>
        {value ? LABELS[value] : "Wybierz ocenę"}
      </p>
    </>
  )
}

const NOTE_PLACEHOLDER = "Notatka, np. za słodki, dobry na śniadanie..."

// Score buttons + note, controlled, for the add form where nothing is saved until the product is
export function RatingFields({ value, onChange }: { value: RatingValue; onChange: (v: RatingValue) => void }) {
  return (
    <div className="space-y-4">
      <ScoreButtons value={value.score} onPick={(score) => onChange({ ...value, score })} />
      <Textarea
        placeholder={NOTE_PLACEHOLDER}
        value={value.note}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
        rows={2}
        className="resize-none"
      />
    </div>
  )
}

type Previous = { kind: "rating"; rating: Rating } | { kind: "skip" } | { kind: "none" }

// Local copy after the logged-in person rated, skipped or cleared a product
function patchProduct(data: SyncData, productId: number, next: Previous): SyncData {
  const me = data.meId
  return {
    ...data,
    products: data.products.map((p) => {
      if (p.id !== productId) return p
      const ratings = p.ratings.filter((r) => r.personId !== me)
      const skippedBy = p.skippedBy.filter((id) => id !== me)
      if (next.kind === "rating") ratings.push({ ...next.rating, personId: me })
      if (next.kind === "skip") skippedBy.push(me)
      return { ...p, ratings, skippedBy }
    }),
  }
}

async function send(productId: number, next: Previous, previous: Previous) {
  const patch = (d: SyncData) => patchProduct(d, productId, next)
  const revert = (d: SyncData) => patchProduct(d, productId, previous)
  if (next.kind === "rating") {
    const { score, note } = next.rating
    await mutateOptimistic("/api/ratings", { method: "PUT", json: { productId, score, note } }, patch, revert)
  } else if (next.kind === "skip") {
    await mutateOptimistic("/api/skips", { method: "PUT", json: { productId } }, patch, revert)
  } else {
    // Clear both: whichever exists goes away
    await mutateOptimistic(`/api/ratings?productId=${productId}`, { method: "DELETE" }, patch, revert)
    await mutateOptimistic(`/api/skips?productId=${productId}`, { method: "DELETE" }, patch, revert)
  }
}

// One write at a time per product: two quick taps must reach the server in order,
// otherwise the first could land last and win. Module level, because the editor
// remounts after every change.
const queues = new Map<number, Promise<unknown>>()

function apply(productId: number, next: Previous, previous: Previous): Promise<void> {
  const run = (queues.get(productId) ?? Promise.resolve()).catch(() => {}).then(() => send(productId, next, previous))
  queues.set(productId, run)
  return run
}

// "Your rating" on the product screen: a tap on a score saves it at once, with undo
export function RatingEditor({
  productId,
  current,
  skipped,
}: {
  productId: number
  current?: Rating
  skipped: boolean
}) {
  const [note, setNote] = useState(current?.note ?? "")
  const previous: Previous = current ? { kind: "rating", rating: current } : skipped ? { kind: "skip" } : { kind: "none" }

  async function change(next: Previous, message: string) {
    try {
      await apply(productId, next, previous)
      toast.success(message, {
        action: {
          label: "Cofnij",
          onClick: () => apply(productId, previous, next).catch((e) => toast.error((e as Error).message)),
        },
      })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function rate(score: number) {
    const rating: Rating = { personId: 0, score, note: note.trim() || null, updatedAt: new Date().toISOString() }
    change({ kind: "rating", rating }, `Zapisano: ${score}`)
  }

  const noteDirty = current && note.trim() !== (current.note ?? "")

  return (
    <div className="space-y-3">
      {skipped && (
        <p className="rounded-xl bg-muted p-3 text-sm">
          Pomijasz ten produkt, więc nie czeka na Twoją ocenę. Stuknij ocenę, jeśli zmienisz zdanie.
        </p>
      )}
      <ScoreButtons value={current?.score ?? null} onPick={rate} />
      <Textarea
        placeholder={NOTE_PLACEHOLDER}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="resize-none"
        aria-label="Notatka"
      />
      {noteDirty && (
        <Button className="h-11 w-full" onClick={() => rate(current.score)}>
          Zapisz notatkę
        </Button>
      )}
      {!current && !noteDirty && note.trim() && (
        <p className="text-center text-xs text-muted-foreground">Notatka zapisze się razem z oceną</p>
      )}
      <div className="flex justify-center gap-4">
        {current && (
          <button onClick={() => change({ kind: "none" }, "Ocena usunięta")} className="min-h-11 px-2 text-sm text-muted-foreground">
            Usuń moją ocenę
          </button>
        )}
        {!skipped ? (
          <button onClick={() => change({ kind: "skip" }, "Pomijasz ten produkt")} className="min-h-11 px-2 text-sm text-muted-foreground">
            Nie będę tego oceniać
          </button>
        ) : (
          <button onClick={() => change({ kind: "none" }, "Produkt znów czeka na Twoją ocenę")} className="min-h-11 px-2 text-sm text-muted-foreground">
            Przestań pomijać
          </button>
        )}
      </div>
    </div>
  )
}
