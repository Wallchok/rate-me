"use client"

import { useRef, useState } from "react"
import { Camera, ChevronDown, ImageIcon, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/image"
import { imageCrossOrigin } from "@/lib/image-cors"
import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface ProductFormValues {
  name: string
  brand: string
  ean: string
  categoryId: string // category id or "__new__"
  newCategory: string
  imageUrl: string
  nutriScore: string
  calories: string
  protein: string
  carbs: string
  sugar: string
  fat: string
}

export const emptyProductForm: ProductFormValues = {
  name: "",
  brand: "",
  ean: "",
  categoryId: "",
  newCategory: "",
  imageUrl: "",
  nutriScore: "",
  calories: "",
  protein: "",
  carbs: "",
  sugar: "",
  fat: "",
}

// Body for POST/PUT /api/products
export function toProductPayload(v: ProductFormValues) {
  const isNew = v.categoryId === "__new__"
  return {
    name: v.name,
    brand: v.brand,
    ean: v.ean,
    categoryId: isNew ? undefined : Number(v.categoryId),
    newCategory: isNew ? v.newCategory : undefined,
    imageUrl: v.imageUrl,
    nutriScore: v.nutriScore,
    calories: v.calories,
    protein: v.protein,
    carbs: v.carbs,
    sugar: v.sugar,
    fat: v.fat,
  }
}

const NUTRITION: { key: keyof ProductFormValues; label: string }[] = [
  { key: "calories", label: "Kalorie (kcal)" },
  { key: "protein", label: "Białko (g)" },
  { key: "carbs", label: "Węglowodany (g)" },
  { key: "sugar", label: "w tym cukry (g)" },
  { key: "fat", label: "Tłuszcz (g)" },
]

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-8 text-base md:text-sm dark:bg-input/30"

export function ProductForm({
  initial,
  categories,
  submitLabel,
  onSubmit,
  children,
}: {
  initial: ProductFormValues
  categories: Category[]
  submitLabel: string
  onSubmit: (values: ProductFormValues) => Promise<void>
  // Extra fields rendered above the submit button (e.g. first rating)
  children?: React.ReactNode
}) {
  const [v, setV] = useState(initial)
  const [uploading, setUploading] = useState(false)
  // Shown under the photo buttons too: a toast can end up behind the edit dialog
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [nutritionOpen, setNutritionOpen] = useState(
    NUTRITION.some(({ key }) => initial[key] !== "") || initial.nutriScore !== ""
  )
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const update = (patch: Partial<ProductFormValues>) => setV((prev) => ({ ...prev, ...patch }))

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    setPhotoError(null)
    const fail = (message: string) => {
      setPhotoError(message)
      toast.error(message)
    }
    try {
      let blob: Blob
      try {
        blob = await compressImage(file)
      } catch {
        // e.g. HEIC outside iOS, the browser cannot decode it
        fail("Nie udało się odczytać zdjęcia. Spróbuj zrobić je aparatem albo wybierz JPG.")
        return
      }
      const form = new FormData()
      form.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }))
      const res = await fetch("/api/upload", { method: "POST", body: form }).catch(() => null)
      if (!res) {
        fail("Brak połączenia. Zdjęcie można dodać tylko z internetem.")
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        fail(json.error || "Nie udało się wysłać zdjęcia")
        return
      }
      update({ imageUrl: json.url })
    } finally {
      setUploading(false)
    }
  }

  const categoryMissing = !v.categoryId || (v.categoryId === "__new__" && !v.newCategory.trim())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (categoryMissing) {
      toast.error("Wybierz kategorię")
      return
    }
    setSaving(true)
    try {
      await onSubmit(v)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="pf-name">Nazwa</Label>
        <Input
          id="pf-name"
          value={v.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="np. Skyr naturalny"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="pf-brand">Marka</Label>
          <Input id="pf-brand" value={v.brand} onChange={(e) => update({ brand: e.target.value })} placeholder="opcjonalnie" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pf-ean">Kod kreskowy</Label>
          <Input
            id="pf-ean"
            inputMode="numeric"
            value={v.ean}
            onChange={(e) => update({ ean: e.target.value.replace(/\D/g, "") })}
            placeholder="opcjonalnie"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pf-category">Kategoria</Label>
        <div className="relative">
          <select
            id="pf-category"
            value={v.categoryId}
            onChange={(e) => update({ categoryId: e.target.value })}
            className={selectClass}
          >
            <option value="" disabled>
              Wybierz kategorię
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new__">+ Nowa kategoria</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {v.categoryId === "__new__" && (
          <Input
            value={v.newCategory}
            onChange={(e) => update({ newCategory: e.target.value })}
            placeholder="Nazwa nowej kategorii"
            autoFocus
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Zdjęcie</Label>
        {v.imageUrl ? (
          <div className="relative overflow-hidden rounded-xl border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview of Blob/OFF image */}
            <img src={v.imageUrl} crossOrigin={imageCrossOrigin(v.imageUrl)} alt="Podgląd" className="mx-auto max-h-48 object-contain" />
            <button
              type="button"
              onClick={() => update({ imageUrl: "" })}
              className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Usuń zdjęcie"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-14" disabled={uploading} onClick={() => cameraRef.current?.click()}>
              {uploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
              Zrób zdjęcie
            </Button>
            <Button type="button" variant="outline" className="h-14" disabled={uploading} onClick={() => galleryRef.current?.click()}>
              <ImageIcon className="size-5" />
              Z galerii
            </Button>
          </div>
        )}
        {photoError && <p className="text-sm text-red-700 dark:text-red-400">{photoError}</p>}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
        <input ref={galleryRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setNutritionOpen(!nutritionOpen)}
          className="flex w-full items-center justify-between py-1 text-sm font-medium text-muted-foreground"
        >
          Skład na 100 g (opcjonalnie)
          <ChevronDown className={cn("size-4 transition-transform", nutritionOpen && "rotate-180")} />
        </button>
        {nutritionOpen && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {NUTRITION.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`pf-${key}`} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={`pf-${key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={v[key]}
                  onChange={(e) => update({ [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="pf-nutri" className="text-xs">
                Nutri-Score
              </Label>
              <select
                id="pf-nutri"
                value={v.nutriScore}
                onChange={(e) => update({ nutriScore: e.target.value })}
                className={selectClass}
              >
                <option value="">brak</option>
                {["a", "b", "c", "d", "e"].map((g) => (
                  <option key={g} value={g}>
                    {g.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {children}

      <Button type="submit" className="h-12 w-full text-base" disabled={saving || uploading}>
        {saving && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  )
}
