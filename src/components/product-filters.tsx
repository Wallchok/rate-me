"use client"

import { Search, X, ChevronDown, Tag, Store } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Category {
  id: number
  name: string
}

interface StoreType {
  id: number
  name: string
}

export type SortOption = "name" | "rating" | "price" | "date"

interface ProductFiltersProps {
  categories: Category[]
  stores: StoreType[]
  selectedCategoryIds: number[]
  selectedStoreIds: number[]
  sortBy: SortOption
  searchQuery: string
  onCategoryChange: (ids: number[]) => void
  onStoreChange: (ids: number[]) => void
  onSortChange: (sort: SortOption) => void
  onSearchChange: (query: string) => void
}

function MultiSelectFilter({
  label,
  icon: Icon,
  items,
  selectedIds,
  onChange,
}: {
  label: string
  icon: React.ElementType
  items: { id: number; name: string }[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}) {
  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
              selectedIds.length > 0
                ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-input bg-background hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50"
            )}
          />
        }
      >
        <Icon className="size-3.5" />
        {label}
        {selectedIds.length > 0 && (
          <Badge
            variant="secondary"
            className="ml-0.5 size-5 justify-center rounded-full p-0 text-[10px] bg-primary text-primary-foreground"
          >
            {selectedIds.length}
          </Badge>
        )}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            Brak opcji
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto">
            {items.map((item) => {
              const checked = selectedIds.includes(item.id)
              return (
                <label
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted transition-colors"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(item.id)}
                  />
                  <span className="text-sm">{item.name}</span>
                </label>
              )
            })}
          </div>
        )}
        {selectedIds.length > 0 && (
          <>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => onChange([])}
              className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
            >
              Wyczyść zaznaczenie
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

function SortSelect({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (val: SortOption) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="appearance-none rounded-lg border border-input bg-background px-3 py-2 pr-8 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer dark:bg-input/30 dark:hover:bg-input/50"
      >
        <option value="date">Najnowsze</option>
        <option value="rating">Najwyższa ocena</option>
        <option value="price">Najniższa cena</option>
        <option value="name">Nazwa A-Z</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
    </div>
  )
}

export function ProductFilters({
  categories,
  stores,
  selectedCategoryIds,
  selectedStoreIds,
  sortBy,
  searchQuery,
  onCategoryChange,
  onStoreChange,
  onSortChange,
  onSearchChange,
}: ProductFiltersProps) {
  const hasActiveFilters =
    selectedCategoryIds.length > 0 ||
    selectedStoreIds.length > 0 ||
    searchQuery !== ""

  function clearFilters() {
    onCategoryChange([])
    onStoreChange([])
    onSearchChange("")
    onSortChange("date")
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj produktów..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <MultiSelectFilter
          label="Kategoria"
          icon={Tag}
          items={categories}
          selectedIds={selectedCategoryIds}
          onChange={onCategoryChange}
        />

        <MultiSelectFilter
          label="Sklep"
          icon={Store}
          items={stores}
          selectedIds={selectedStoreIds}
          onChange={onStoreChange}
        />

        <SortSelect value={sortBy} onChange={onSortChange} />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="size-3.5" />
            Wyczyść
          </Button>
        )}
      </div>
    </div>
  )
}
