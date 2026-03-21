"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Download, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Header } from "@/components/header";
import { ProductCard } from "@/components/product-card";
import { ProductFilters, type SortOption } from "@/components/product-filters";
import { ProductForm, type ProductFormData } from "@/components/product-form";
import { toast } from "sonner";

interface Person {
  id: number;
  name: string;
}
interface Category {
  id: number;
  name: string;
}
interface Store {
  id: number;
  name: string;
}
interface Product {
  id: number;
  name: string;
  imageUrl: string | null;
  price: number | null;
  createdAt: string;
  category: Category;
  store: Store | null;
  ratings: { score: number; personId: number }[];
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("date");

  const fetchAll = useCallback(async () => {
    const [productsRes, categoriesRes, storesRes, personsRes] =
      await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/stores"),
        fetch("/api/persons"),
      ]);
    setProducts(await productsRes.json());
    setCategories(await categoriesRes.json());
    setStores(await storesRes.json());
    const personsList = await personsRes.json();
    setPersons(personsList);
    if (personsList.length > 0 && !selectedPersonId) {
      setSelectedPersonId(personsList[0].id);
    }
    setLoading(false);
  }, [selectedPersonId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleAddProduct(data: ProductFormData) {
    let categoryId = data.categoryId;
    if (data.newCategory) {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.newCategory }),
      });
      const cat = await res.json();
      categoryId = cat.id;
    }

    let storeId = data.storeId;
    if (data.newStore) {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.newStore }),
      });
      const store = await res.json();
      storeId = store.id;
    }

    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        categoryId,
        storeId,
        imageUrl: data.imageUrl || null,
        price: data.price ? parseFloat(data.price) : null,
        calories: data.calories ? parseFloat(data.calories) : null,
        protein: data.protein ? parseFloat(data.protein) : null,
        carbs: data.carbs ? parseFloat(data.carbs) : null,
        fat: data.fat ? parseFloat(data.fat) : null,
      }),
    });

    toast.success("Produkt dodany!");
    setDialogOpen(false);
    fetchAll();
  }

  async function handleAddPerson() {
    if (!newPersonName.trim()) return;
    await fetch("/api/persons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPersonName.trim() }),
    });
    setNewPersonName("");
    setPersonDialogOpen(false);
    toast.success("Osoba dodana!");
    fetchAll();
  }

  async function handleExport(format: "csv" | "json" | "excel") {
    const res = await fetch(`/api/export?format=${format}`);
    const blob = await res.blob();
    const ext = format === "excel" ? "xlsx" : format;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rateme-export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Wyeksportowano jako ${format.toUpperCase()}`);
  }

  const avgRating = (ratings: { score: number }[]) => {
    if (ratings.length === 0) return 0;
    return ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (selectedCategoryIds.length > 0) {
      result = result.filter((p) => selectedCategoryIds.includes(p.category.id));
    }
    if (selectedStoreIds.length > 0) {
      result = result.filter((p) => p.store !== null && selectedStoreIds.includes(p.store.id));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rating":
          return avgRating(b.ratings) - avgRating(a.ratings);
        case "price":
          return (a.price ?? 999) - (b.price ?? 999);
        case "date":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchQuery, selectedCategoryIds, selectedStoreIds, sortBy]);

  return (
    <div className="flex min-h-full flex-col">
      <Header
        persons={persons}
        selectedPersonId={selectedPersonId}
        onPersonChange={setSelectedPersonId}
      />

      <main className="flex-1 px-4 sm:px-6 py-5 space-y-5 max-w-5xl mx-auto w-full">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Dialog open={personDialogOpen} onOpenChange={setPersonDialogOpen}>
            <DialogTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Dodaj osobę</span>
              <span className="sm:hidden">Osoba</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj osobę</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddPerson();
                }}
                className="flex gap-2"
              >
                <input
                  className="flex-1 rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Imię"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  autoFocus
                />
                <Button type="submit">Dodaj</Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("excel")}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
            >
              <span className="text-xs">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("json")}
            >
              <span className="text-xs">JSON</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <ProductFilters
          categories={categories}
          stores={stores}
          selectedCategoryIds={selectedCategoryIds}
          selectedStoreIds={selectedStoreIds}
          sortBy={sortBy}
          searchQuery={searchQuery}
          onCategoryChange={setSelectedCategoryIds}
          onStoreChange={setSelectedStoreIds}
          onSortChange={setSortBy}
          onSearchChange={setSearchQuery}
        />

        {/* Products grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "produkt" : filteredProducts.length < 5 ? "produkty" : "produktów"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10">
              <Package className="size-10 text-primary" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="font-semibold text-lg">Brak produktów</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Dodaj swój pierwszy produkt klikając przycisk + w prawym dolnym rogu
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="font-medium">Brak wyników</p>
            <p className="text-sm text-muted-foreground">
              Spróbuj zmienić kryteria wyszukiwania
            </p>
          </div>
        )}
      </main>

      {/* FAB */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger
          render={
            <Button
              size="lg"
              className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg shadow-primary/25 size-14 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all duration-200"
            />
          }
        >
          <Plus className="size-6" />
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj produkt</DialogTitle>
          </DialogHeader>
          <ProductForm
            categories={categories}
            stores={stores}
            onSubmit={handleAddProduct}
            submitLabel="Dodaj produkt"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
