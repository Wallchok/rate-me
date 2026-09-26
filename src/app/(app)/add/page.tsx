"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, PencilLine, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { mutate, useStore } from "@/lib/store";
import { normalizeEan } from "@/lib/ean";
import type { SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { CatalogSearch } from "@/components/catalog-search";
import { ProductForm, emptyProductForm, toProductPayload, type ProductFormValues } from "@/components/product-form";
import { RatingFields, type RatingValue } from "@/components/rating-editor";
import { buttonVariants } from "@/components/ui/button";

type Stage =
  | { kind: "choose" }
  | { kind: "loading"; ean: string }
  | { kind: "known"; productId: number; name: string }
  | { kind: "form"; initial: ProductFormValues; info?: string };

interface OffProduct {
  found: boolean;
  name?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  nutriScore?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  sugar?: number | null;
  fat?: number | null;
}

// Fills the form from Open Food Facts; falls back to an empty form with just the barcode
async function lookup(ean: string): Promise<Stage> {
  const base = { ...emptyProductForm, ean };
  try {
    const res = await fetch(`/api/off/${ean}`);
    const off: OffProduct = await res.json();
    if (!res.ok || !off.found) {
      return { kind: "form", initial: base, info: "Nie znaleźliśmy tego kodu w bazie produktów. Uzupełnij dane ręcznie." };
    }
    const s = (n?: number | null) => (n === null || n === undefined ? "" : String(n));
    return {
      kind: "form",
      initial: {
        ...base,
        name: off.name ?? "",
        brand: off.brand ?? "",
        imageUrl: off.imageUrl ?? "",
        nutriScore: off.nutriScore ?? "",
        calories: s(off.calories),
        protein: s(off.protein),
        carbs: s(off.carbs),
        sugar: s(off.sugar),
        fat: s(off.fat),
      },
      info: "Dane z Open Food Facts. Sprawdź i wybierz kategorię.",
    };
  } catch {
    return { kind: "form", initial: base, info: "Brak połączenia z bazą produktów. Uzupełnij dane ręcznie." };
  }
}

export default function AddPage() {
  return (
    <>
      <PageHeader back title="Dodaj produkt" />
      <WithData>
        {(d) => (
          <Suspense>
            <AddFlow data={d} />
          </Suspense>
        )}
      </WithData>
    </>
  );
}

function knownStage(data: SyncData, ean: string): Stage | null {
  const existing = data.products.find((p) => p.ean === normalizeEan(ean));
  return existing ? { kind: "known", productId: existing.id, name: existing.name } : null;
}

function AddFlow({ data }: { data: SyncData }) {
  const router = useRouter();
  const initialEan = useSearchParams().get("ean");
  const { data: live } = useStore();
  const [stage, setStage] = useState<Stage>(() =>
    initialEan ? (knownStage(data, initialEan) ?? { kind: "loading", ean: initialEan }) : { kind: "choose" }
  );
  const [scanOpen, setScanOpen] = useState(false);
  const [rating, setRating] = useState<RatingValue>({ score: null, note: "" });

  const loadingEan = stage.kind === "loading" ? stage.ean : null;
  useEffect(() => {
    if (!loadingEan) return;
    let cancelled = false;
    lookup(loadingEan).then((next) => !cancelled && setStage(next));
    return () => {
      cancelled = true;
    };
  }, [loadingEan]);

  function onScan(ean: string) {
    setScanOpen(false);
    setStage(knownStage(live ?? data, ean) ?? { kind: "loading", ean });
  }

  async function save(values: ProductFormValues) {
    try {
      const created = await mutate<{ id: number }>("/api/products", {
        method: "POST",
        json: { ...toProductPayload(values), rating: rating.score ? rating : undefined },
      });
      toast.success(rating.score ? "Dodano i oceniono" : "Dodano");
      router.replace(`/product?id=${created.id}`);
    } catch (e) {
      const err = e as Error & { body?: { productId?: number } };
      if (err.body?.productId) {
        router.replace(`/product?id=${err.body.productId}`);
        toast("Ten produkt już jest w bazie");
        return;
      }
      toast.error(err.message);
    }
  }

  return (
    <main className="space-y-4 px-4 pb-6">
      {stage.kind === "choose" && (
        <div className="grid gap-3 pt-2">
          <CatalogSearch products={(live ?? data).products} onPick={onScan} />
          <p className="pt-1 text-center text-xs text-muted-foreground">albo</p>
          <button
            onClick={() => setScanOpen(true)}
            className="flex items-center gap-4 rounded-2xl border bg-card p-5 text-left active:bg-muted"
          >
            <ScanBarcode className="size-8 text-primary" />
            <span>
              <span className="block font-semibold">Zeskanuj kod z opakowania</span>
              <span className="text-sm text-muted-foreground">Nazwa, zdjęcie i skład uzupełnią się same</span>
            </span>
          </button>
          <button
            onClick={() => setStage({ kind: "form", initial: emptyProductForm })}
            className="flex items-center gap-4 rounded-2xl border bg-card p-5 text-left active:bg-muted"
          >
            <PencilLine className="size-8 text-muted-foreground" />
            <span>
              <span className="block font-semibold">Wpisz ręcznie</span>
              <span className="text-sm text-muted-foreground">Np. pieczywo albo warzywa bez kodu</span>
            </span>
          </button>
        </div>
      )}

      {stage.kind === "loading" && (
        <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-7 animate-spin text-primary" />
          Szukam produktu {stage.ean}...
        </div>
      )}

      {stage.kind === "known" && (
        <div className="space-y-3 rounded-2xl border p-5 text-center">
          <p className="font-semibold">Ten produkt już macie</p>
          <p className="text-sm text-muted-foreground">{stage.name}</p>
          <Link href={`/product?id=${stage.productId}`} className={buttonVariants({ className: "h-11 w-full" })}>
            Przejdź do produktu
          </Link>
        </div>
      )}

      {stage.kind === "form" && (
        <>
          {stage.info && <p className="rounded-xl bg-muted p-3 text-sm">{stage.info}</p>}
          <ProductForm
            key={stage.initial.ean || "manual"}
            initial={stage.initial}
            categories={data.categories}
            submitLabel="Dodaj produkt"
            onSubmit={save}
          >
            <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
              <p className="font-semibold">Twoja ocena (możesz też później)</p>
              <RatingFields value={rating} onChange={setRating} />
            </div>
          </ProductForm>
        </>
      )}

      <BarcodeScanner open={scanOpen} onOpenChange={setScanOpen} onDetected={onScan} />
    </main>
  );
}
