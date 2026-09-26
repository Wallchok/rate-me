"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { mutate } from "@/lib/store"
import type { Rating } from "@/lib/types"
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

// Score buttons + note. Controlled, so the add form can reuse it without saving.
export function RatingFields({ value, onChange }: { value: RatingValue; onChange: (v: RatingValue) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange({ ...value, score: n })}
            aria-pressed={value.score === n}
            className={cn(
              "h-12 rounded-xl text-lg font-bold tabular-nums transition-all",
              value.score === n
                ? cn(scoreBg(n), scoreTone(n), "ring-2 ring-current")
                : "bg-muted text-muted-foreground active:bg-muted/60"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className={cn("h-5 text-center text-sm font-medium", value.score && scoreTone(value.score))}>
        {value.score ? LABELS[value.score] : "Wybierz ocenę"}
      </p>
      <Textarea
        placeholder="Notatka, np. za słodki, dobry na śniadanie..."
        value={value.note}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
        rows={2}
        className="resize-none"
      />
    </div>
  )
}

// "Your rating" card on the product screen
export function RatingEditor({ productId, current }: { productId: number; current?: Rating }) {
  const [value, setValue] = useState<RatingValue>({
    score: current?.score ?? null,
    note: current?.note ?? "",
  })
  const [saving, setSaving] = useState(false)

  const dirty =
    value.score !== (current?.score ?? null) ||
    value.note !== (current?.note ?? "")

  async function save() {
    if (!value.score) return
    setSaving(true)
    try {
      await mutate("/api/ratings", { method: "PUT", json: { productId, ...value } })
      toast.success("Ocena zapisana")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setSaving(true)
    try {
      await mutate(`/api/ratings?productId=${productId}`, { method: "DELETE" })
      setValue({ score: null, note: "" })
      toast.success("Ocena usunięta")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <RatingFields value={value} onChange={setValue} />
      <Button className="h-12 w-full text-base" onClick={save} disabled={!value.score || !dirty || saving}>
        {saving && <Loader2 className="size-4 animate-spin" />}
        {current ? "Zapisz zmiany" : "Zapisz ocenę"}
      </Button>
      {current && (
        <button onClick={remove} disabled={saving} className="w-full py-2 text-sm text-muted-foreground">
          Usuń moją ocenę
        </button>
      )}
    </div>
  )
}
