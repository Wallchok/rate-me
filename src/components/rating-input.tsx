"use client"

import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface RatingInputProps {
  value: number
  note: string
  onChange: (score: number, note: string) => void
}

function getRatingColor(score: number) {
  if (score >= 8) return "text-emerald-500"
  if (score >= 5) return "text-amber-500"
  return "text-red-500"
}

function getRatingBg(score: number) {
  if (score >= 8) return "bg-emerald-500/10"
  if (score >= 5) return "bg-amber-500/10"
  return "bg-red-500/10"
}

function getRatingLabel(score: number) {
  if (score >= 9) return "Wybitny"
  if (score >= 8) return "Świetny"
  if (score >= 7) return "Bardzo dobry"
  if (score >= 6) return "Dobry"
  if (score >= 5) return "Przeciętny"
  if (score >= 4) return "Słaby"
  if (score >= 3) return "Kiepski"
  if (score >= 2) return "Bardzo kiepski"
  return "Tragiczny"
}

export function RatingInput({ value, note, onChange }: RatingInputProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-1.5">
        <div className={cn("flex size-20 items-center justify-center rounded-2xl", getRatingBg(value))}>
          <span className={cn("text-4xl font-bold tabular-nums", getRatingColor(value))}>
            {value}
          </span>
        </div>
        <span className={cn("text-sm font-medium", getRatingColor(value))}>
          {getRatingLabel(value)}
        </span>
      </div>

      <Slider
        value={[value]}
        onValueChange={(newValue) => {
          const v = Array.isArray(newValue) ? newValue[0] : newValue
          onChange(v, note)
        }}
        min={1}
        max={10}
        step={1}
      />

      <div className="flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num, note)}
            className={cn(
              "flex size-9 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-150",
              num === value
                ? cn("scale-110 shadow-sm", getRatingBg(num), getRatingColor(num), "ring-1 ring-current/20")
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {num}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rating-note">Notatka (opcjonalnie)</Label>
        <Textarea
          id="rating-note"
          placeholder="Twoje wrażenia o produkcie..."
          value={note}
          onChange={(e) => onChange(value, e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  )
}
