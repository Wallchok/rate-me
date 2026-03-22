"use client"

import { useState, useRef } from "react"
import { ChevronDown, Plus, Upload, ImageIcon, X, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface Category {
  id: number
  name: string
}

interface Store {
  id: number
  name: string
}

export interface ProductFormData {
  name: string
  categoryId: number | null
  newCategory: string
  storeId: number | null
  newStore: string
  imageUrl: string
  price: string
  calories: string
  protein: string
  carbs: string
  fat: string
}

interface ProductFormProps {
  categories: Category[]
  stores: Store[]
  initialData?: Partial<ProductFormData>
  onSubmit: (data: ProductFormData) => void
  submitLabel?: string
}

const defaultData: ProductFormData = {
  name: "",
  categoryId: null,
  newCategory: "",
  storeId: null,
  newStore: "",
  imageUrl: "",
  price: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
}

function FormSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string
  onChange: (val: string) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 pr-8 text-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer dark:bg-input/30 dark:hover:bg-input/50"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
    </div>
  )
}

export function ProductForm({
  categories,
  stores,
  initialData,
  onSubmit,
  submitLabel = "Zapisz",
}: ProductFormProps) {
  const [data, setData] = useState<ProductFormData>({
    ...defaultData,
    ...initialData,
  })
  const [macrosOpen, setMacrosOpen] = useState(false)
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [creatingStore, setCreatingStore] = useState(false)

  function update(patch: Partial<ProductFormData>) {
    setData((prev) => ({ ...prev, ...patch }))
  }

  function handleCategoryChange(val: string) {
    if (val === "__new__") {
      setCreatingCategory(true)
      update({ categoryId: null })
    } else {
      setCreatingCategory(false)
      update({ categoryId: val ? parseInt(val) : null, newCategory: "" })
    }
  }

  function handleStoreChange(val: string) {
    if (val === "__new__") {
      setCreatingStore(true)
      update({ storeId: null })
    } else if (val === "") {
      setCreatingStore(false)
      update({ storeId: null, newStore: "" })
    } else {
      setCreatingStore(false)
      update({ storeId: parseInt(val), newStore: "" })
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const json = await res.json()
      if (res.ok) {
        update({ imageUrl: json.url })
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="product-name">Nazwa</Label>
        <Input
          id="product-name"
          placeholder="Nazwa produktu"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Kategoria</Label>
        {creatingCategory ? (
          <div className="flex gap-2">
            <Input
              placeholder="Nazwa nowej kategorii"
              value={data.newCategory}
              onChange={(e) => update({ newCategory: e.target.value })}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreatingCategory(false)
                update({ newCategory: "" })
              }}
            >
              Anuluj
            </Button>
          </div>
        ) : (
          <FormSelect
            value={data.categoryId?.toString() ?? ""}
            onChange={handleCategoryChange}
          >
            <option value="" disabled>Wybierz kategorię</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </option>
            ))}
            <option value="__new__">+ Utwórz nową kategorię</option>
          </FormSelect>
        )}
      </div>

      <div className="space-y-2">
        <Label>Sklep</Label>
        {creatingStore ? (
          <div className="flex gap-2">
            <Input
              placeholder="Nazwa nowego sklepu"
              value={data.newStore}
              onChange={(e) => update({ newStore: e.target.value })}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreatingStore(false)
                update({ newStore: "" })
              }}
            >
              Anuluj
            </Button>
          </div>
        ) : (
          <FormSelect
            value={data.storeId?.toString() ?? ""}
            onChange={handleStoreChange}
          >
            <option value="">Wszędzie</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id.toString()}>
                {store.name}
              </option>
            ))}
            <option value="__new__">+ Dodaj nowy sklep</option>
          </FormSelect>
        )}
      </div>

      <div className="space-y-2">
        <Label>Zdjęcie</Label>
        {data.imageUrl ? (
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={data.imageUrl}
              alt="Podgląd"
              className="w-full max-h-48 object-contain bg-muted/30"
            />
            <button
              type="button"
              onClick={() => update({ imageUrl: "" })}
              className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
              uploading
                ? "border-primary/50 bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            {uploading ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Upload className="size-4 animate-bounce" />
                Przesyłanie...
              </div>
            ) : (
              <>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/25 px-4 py-3 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <Camera className="size-6 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">Zrób zdjęcie</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/25 px-4 py-3 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <ImageIcon className="size-6 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">Z galerii</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground/60">
                  JPG, PNG, WebP — maks. 5MB
                </p>
              </>
            )}
          </div>
        )}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileUpload}
          className="hidden"
        />
        {!data.imageUrl && (
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">lub wklej URL</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}
        {!data.imageUrl && (
          <Input
            type="url"
            placeholder="https://..."
            value={data.imageUrl}
            onChange={(e) => update({ imageUrl: e.target.value })}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-price">Cena (zł)</Label>
        <Input
          id="product-price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={data.price}
          onChange={(e) => update({ price: e.target.value })}
        />
      </div>

      <Separator />

      <button
        type="button"
        onClick={() => setMacrosOpen(!macrosOpen)}
        className="flex w-full items-center justify-between py-1 text-sm font-medium transition-colors hover:text-foreground text-muted-foreground"
      >
        Makroskładniki (opcjonalnie)
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-200",
            macrosOpen && "rotate-180"
          )}
        />
      </button>

      {macrosOpen && (
        <div className="grid grid-cols-2 gap-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <Label htmlFor="macro-cal" className="text-xs">
              Kalorie
            </Label>
            <Input
              id="macro-cal"
              type="number"
              min="0"
              placeholder="kcal"
              value={data.calories}
              onChange={(e) => update({ calories: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="macro-protein" className="text-xs">
              Białko (g)
            </Label>
            <Input
              id="macro-protein"
              type="number"
              min="0"
              step="0.1"
              placeholder="g"
              value={data.protein}
              onChange={(e) => update({ protein: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="macro-carbs" className="text-xs">
              Węglowodany (g)
            </Label>
            <Input
              id="macro-carbs"
              type="number"
              min="0"
              step="0.1"
              placeholder="g"
              value={data.carbs}
              onChange={(e) => update({ carbs: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="macro-fat" className="text-xs">
              Tłuszcz (g)
            </Label>
            <Input
              id="macro-fat"
              type="number"
              min="0"
              step="0.1"
              placeholder="g"
              value={data.fat}
              onChange={(e) => update({ fat: e.target.value })}
            />
          </div>
        </div>
      )}

      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  )
}
