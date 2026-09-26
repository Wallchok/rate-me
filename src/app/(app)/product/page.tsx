"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mutate, sync, useStore } from "@/lib/store";
import { hasSkipped, ratingOf, verdict } from "@/lib/ranking";
import type { Product, SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { PersonAvatar, scoreBg, scoreTone } from "@/components/person-badge";
import { ProductThumb } from "@/components/product-row";
import { RatingEditor } from "@/components/rating-editor";
import { ProductForm, toProductPayload, type ProductFormValues } from "@/components/product-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const NUTRI_COLORS: Record<string, string> = {
  a: "bg-emerald-600",
  b: "bg-lime-500",
  c: "bg-yellow-400 text-black",
  d: "bg-orange-500",
  e: "bg-red-600",
};

export default function ProductPage() {
  return (
    <Suspense>
      <ProductScreen />
    </Suspense>
  );
}

function ProductScreen() {
  const id = Number(useSearchParams().get("id"));
  const { data, status } = useStore();
  const product = data?.products.find((p) => p.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <PageHeader
        back
        title={product?.name ?? "Produkt"}
        actions={
          product && (
            <>
              <Button variant="ghost" size="icon" className="size-11" onClick={() => setEditOpen(true)} aria-label="Edytuj produkt">
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-11" onClick={() => setDeleteOpen(true)} aria-label="Usuń produkt">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </>
          )
        }
      />
      <WithData>
        {(d) =>
          product ? (
            <>
              <Details data={d} product={product} />
              <EditDialog data={d} product={product} open={editOpen} onOpenChange={setEditOpen} />
              <DeleteDialog product={product} open={deleteOpen} onOpenChange={setDeleteOpen} />
            </>
          ) : (
            <NotLoaded online={status === "ok"} />
          )
        }
      </WithData>
    </>
  );
}

// A product saved a moment ago can be missing locally when the refresh after saving failed
function NotLoaded({ online }: { online: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-sm text-muted-foreground">
      <p>{online ? "Nie ma takiego produktu" : "Ten produkt jeszcze się nie wczytał."}</p>
      {!online && (
        <Button variant="outline" onClick={() => sync()}>
          Odśwież
        </Button>
      )}
    </div>
  );
}

function Details({ data, product }: { data: SyncData; product: Product }) {
  const category = data.categories.find((c) => c.id === product.categoryId);
  const mine = ratingOf(product, data.meId);
  const skippedByMe = hasSkipped(product, data.meId);
  const v = verdict(product, data.persons);
  const nutrition = [
    { label: "kcal", value: product.calories },
    { label: "białko", value: product.protein, unit: "g" },
    { label: "węgl.", value: product.carbs, unit: "g" },
    { label: "cukry", value: product.sugar, unit: "g" },
    { label: "tłuszcz", value: product.fat, unit: "g" },
  ].filter((n) => n.value !== null);

  return (
    <main className="space-y-5 px-4 pb-6">
      <div className="flex gap-4">
        <ProductThumb product={product} className="size-28 shrink-0 border" />
        <div className="min-w-0 space-y-1.5 py-1">
          {product.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
          {category && (
            <Link href={`/category?id=${category.id}`} className="inline-flex min-h-8 items-center rounded-full bg-muted px-3 text-xs font-medium">
              {category.name}
            </Link>
          )}
          <p
            className={cn(
              "text-sm font-semibold",
              v.tone === "good" && "text-emerald-600 dark:text-emerald-400",
              v.tone === "bad" && "text-red-600 dark:text-red-400"
            )}
          >
            {v.text}
          </p>
          {product.nutriScore && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold text-white",
                NUTRI_COLORS[product.nutriScore]
              )}
            >
              Nutri-Score {product.nutriScore.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Oceny</h2>
        {data.persons.map((person) => {
          const r = ratingOf(product, person.id);
          return (
            <div key={person.id} className="flex items-start gap-3 rounded-xl border p-3">
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold tabular-nums",
                  r ? cn(scoreBg(r.score), scoreTone(r.score)) : "bg-muted text-muted-foreground"
                )}
              >
                {r ? r.score : "?"}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex items-center gap-1.5 font-medium">
                  <PersonAvatar persons={data.persons} person={person} />
                  {person.name}
                  {person.id === data.meId && <span className="text-xs font-normal text-muted-foreground">(Ty)</span>}
                </p>
                {!r && (
                  <p className="text-sm text-muted-foreground">
                    {hasSkipped(product, person.id) ? "Pomija ten produkt" : "Jeszcze nieocenione"}
                  </p>
                )}
                {r?.note && (
                  <p className="flex gap-1.5 text-sm text-muted-foreground">
                    <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
                    {r.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-3 rounded-2xl bg-muted/50 p-4">
        <h2 className="font-semibold">{mine ? "Twoja ocena" : "Oceń ten produkt"}</h2>
        <RatingEditor
          key={`${product.id}-${mine?.updatedAt ?? "none"}-${skippedByMe}`}
          productId={product.id}
          current={mine}
          skipped={skippedByMe}
        />
      </section>

      {nutrition.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Na 100 g</h2>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {nutrition.map((n) => (
              <div key={n.label} className="rounded-lg bg-muted/60 px-1 py-2">
                <p className="text-sm font-semibold tabular-nums">
                  {n.value}
                  {n.unit}
                </p>
                <p className="text-[11px] text-muted-foreground">{n.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {product.ean && <p className="text-center text-xs text-muted-foreground">Kod: {product.ean}</p>}
    </main>
  );
}

function toFormValues(p: Product): ProductFormValues {
  const s = (n: number | null) => (n === null ? "" : String(n));
  return {
    name: p.name,
    brand: p.brand ?? "",
    ean: p.ean ?? "",
    categoryId: String(p.categoryId),
    newCategory: "",
    imageUrl: p.imageUrl ?? "",
    nutriScore: p.nutriScore ?? "",
    calories: s(p.calories),
    protein: s(p.protein),
    carbs: s(p.carbs),
    sugar: s(p.sugar),
    fat: s(p.fat),
  };
}

function EditDialog({
  data,
  product,
  open,
  onOpenChange,
}: {
  data: SyncData;
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  async function save(values: ProductFormValues) {
    try {
      await mutate(`/api/products/${product.id}`, { method: "PUT", json: toProductPayload(values) });
      toast.success("Zapisano");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edytuj produkt</DialogTitle>
        </DialogHeader>
        {open && (
          <ProductForm initial={toFormValues(product)} categories={data.categories} submitLabel="Zapisz" onSubmit={save} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await mutate(`/api/products/${product.id}`, { method: "DELETE" });
      toast.success("Produkt usunięty");
      router.replace("/");
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usunąć „{product.name}”?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Znikną też wszystkie oceny tego produktu. Tego nie da się cofnąć.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button variant="destructive" onClick={remove} disabled={busy}>
            Usuń
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
