"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Edit,
  Star,
  ImageIcon,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RatingInput } from "@/components/rating-input";
import { ProductForm, type ProductFormData } from "@/components/product-form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Rating {
  id: number;
  score: number;
  note: string | null;
  personId: number;
  person: { id: number; name: string };
}

interface Product {
  id: number;
  name: string;
  imageUrl: string | null;
  price: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  createdAt: string;
  category: { id: number; name: string };
  store: { id: number; name: string } | null;
  ratings: Rating[];
}

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

function getRatingColor(score: number) {
  if (score >= 8) return "text-emerald-500";
  if (score >= 5) return "text-amber-500";
  return "text-red-500";
}

function getRatingBg(score: number) {
  if (score >= 8) return "bg-emerald-500/10";
  if (score >= 5) return "bg-amber-500/10";
  return "bg-red-500/10";
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingNote, setRatingNote] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchProduct = useCallback(async () => {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) {
      router.push("/");
      return;
    }
    setProduct(await res.json());
  }, [id, router]);

  const fetchMeta = useCallback(async () => {
    const [personsRes, catsRes, storesRes] = await Promise.all([
      fetch("/api/persons"),
      fetch("/api/categories"),
      fetch("/api/stores"),
    ]);
    const personsList = await personsRes.json();
    setPersons(personsList);
    setCategories(await catsRes.json());
    setStores(await storesRes.json());
    if (personsList.length > 0 && !selectedPersonId) {
      setSelectedPersonId(personsList[0].id);
    }
  }, [selectedPersonId]);

  useEffect(() => {
    fetchProduct();
    fetchMeta();
  }, [fetchProduct, fetchMeta]);

  useEffect(() => {
    if (product && selectedPersonId) {
      const existing = product.ratings.find(
        (r) => r.personId === selectedPersonId
      );
      if (existing) {
        setRatingScore(existing.score);
        setRatingNote(existing.note || "");
      } else {
        setRatingScore(5);
        setRatingNote("");
      }
    }
  }, [product, selectedPersonId]);

  async function handleRate() {
    if (!selectedPersonId) {
      toast.error("Najpierw wybierz osobę");
      return;
    }
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: parseInt(id),
        personId: selectedPersonId,
        score: ratingScore,
        note: ratingNote || null,
      }),
    });
    toast.success("Ocena zapisana!");
    fetchProduct();
  }

  async function handleDelete() {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    toast.success("Produkt usunięty");
    router.push("/");
  }

  async function handleEdit(data: ProductFormData) {
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

    await fetch(`/api/products/${id}`, {
      method: "PUT",
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
    toast.success("Produkt zaktualizowany!");
    setEditDialogOpen(false);
    fetchProduct();
    fetchMeta();
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  const avgRating =
    product.ratings.length > 0
      ? Math.round(
          (product.ratings.reduce((s, r) => s + r.score, 0) /
            product.ratings.length) *
            10
        ) / 10
      : null;

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            aria-label="Wróć"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="flex-1 truncate font-semibold">{product.name}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditDialogOpen(true)}
            aria-label="Edytuj produkt"
          >
            <Edit className="size-4" />
          </Button>

          {/* Delete confirmation dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Usuń produkt" />
              }
            >
              <Trash2 className="size-4 text-destructive" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Usunąć produkt?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Czy na pewno chcesz usunąć <strong>{product.name}</strong>?
                Zostaną usunięte również wszystkie oceny. Tej operacji nie można
                cofnąć.
              </p>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Anuluj
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                >
                  Usuń
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* Image */}
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full rounded-xl object-contain bg-muted/30 max-h-72 shadow-sm"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/50">
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="size-12 text-muted-foreground/20" />
              <span className="text-xs text-muted-foreground/40">
                Brak zdjęcia
              </span>
            </div>
          </div>
        )}

        {/* Info section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{product.category.name}</Badge>
            {product.store && (
              <Badge variant="outline">{product.store.name}</Badge>
            )}
            {product.price !== null && (
              <span className="text-sm font-medium text-muted-foreground ml-auto">
                {product.price.toFixed(2)} zł
              </span>
            )}
          </div>

          {/* Rating hero */}
          {avgRating !== null && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl p-4",
                getRatingBg(avgRating)
              )}
            >
              <Star
                className={cn(
                  "size-8 fill-current",
                  getRatingColor(avgRating)
                )}
              />
              <div>
                <span
                  className={cn(
                    "text-3xl font-bold",
                    getRatingColor(avgRating)
                  )}
                >
                  {avgRating}
                </span>
                <span className="text-lg text-muted-foreground">/10</span>
              </div>
              <span className="text-sm text-muted-foreground ml-auto">
                {product.ratings.length}{" "}
                {product.ratings.length === 1
                  ? "ocena"
                  : product.ratings.length < 5
                    ? "oceny"
                    : "ocen"}
              </span>
            </div>
          )}
        </div>

        {/* Macros */}
        {(product.calories || product.protein || product.carbs || product.fat) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Makroskładniki</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 text-center">
                {product.calories !== null && (
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-semibold">{product.calories}</p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                )}
                {product.protein !== null && (
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-semibold">{product.protein}g</p>
                    <p className="text-xs text-muted-foreground">białko</p>
                  </div>
                )}
                {product.carbs !== null && (
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-semibold">{product.carbs}g</p>
                    <p className="text-xs text-muted-foreground">węglowodany</p>
                  </div>
                )}
                {product.fat !== null && (
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-semibold">{product.fat}g</p>
                    <p className="text-xs text-muted-foreground">tłuszcz</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Rate this product */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Oceń ten produkt</CardTitle>
              <select
                className="rounded-lg border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedPersonId ?? ""}
                onChange={(e) =>
                  setSelectedPersonId(parseInt(e.target.value))
                }
              >
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <RatingInput
              value={ratingScore}
              note={ratingNote}
              onChange={(score, note) => {
                setRatingScore(score);
                setRatingNote(note);
              }}
            />
            <Button onClick={handleRate} className="w-full">
              Zapisz ocenę
            </Button>
          </CardContent>
        </Card>

        {/* All ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wszystkie oceny</CardTitle>
          </CardHeader>
          <CardContent>
            {product.ratings.length > 0 ? (
              <div className="divide-y">
                {product.ratings.map((rating) => (
                  <div
                    key={rating.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm",
                        getRatingColor(rating.score),
                        getRatingBg(rating.score)
                      )}
                    >
                      {rating.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {rating.person.name}
                      </p>
                      {rating.note && (
                        <div className="flex items-start gap-1.5 mt-1">
                          <MessageSquare className="size-3 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">
                            {rating.note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Brak ocen — bądź pierwszy!
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edytuj produkt</DialogTitle>
          </DialogHeader>
          <ProductForm
            categories={categories}
            stores={stores}
            initialData={{
              name: product.name,
              categoryId: product.category.id,
              storeId: product.store?.id ?? null,
              imageUrl: product.imageUrl || "",
              price: product.price?.toString() || "",
              calories: product.calories?.toString() || "",
              protein: product.protein?.toString() || "",
              carbs: product.carbs?.toString() || "",
              fat: product.fat?.toString() || "",
            }}
            onSubmit={handleEdit}
            submitLabel="Zaktualizuj produkt"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
