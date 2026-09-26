"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Loader2, PencilLine, ScanBarcode } from "lucide-react";
import { compressImage } from "@/lib/image";
import { toast } from "sonner";
import { mutate, useStore } from "@/lib/store";
import { normalizeEan } from "@/lib/ean";
import type { SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { CatalogSearch } from "@/components/catalog-search";
import { ProductForm, emptyProductForm, toProductPayload, type ProductFormValues } from "@/components/product-form";
import { RatingFields, type RatingValue } from "@/components/rating-editor";
import { Button, buttonVariants } from "@/components/ui/button";

type Stage =
  | { kind: "choose" }
  | { kind: "loading"; ean: string }
  | { kind: "known"; productId: number; name: string }
  | { kind: "form"; initial: ProductFormValues; info?: string; recognize?: boolean; rev?: number };

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
      return {
        kind: "form",
        initial: { ...base, brand: off.brand ?? "" },
        info: off.brand
          ? `Nie znaleźliśmy produktu w bazie, ale wiemy, że producent to ${off.brand}. Uzupełnij nazwę albo rozpoznaj ze zdjęcia.`
          : "Nie znaleźliśmy tego kodu w bazie produktów. Uzupełnij dane ręcznie albo rozpoznaj ze zdjęcia.",
        recognize: true,
      };
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
            onClick={() => setStage({ kind: "form", initial: emptyProductForm, recognize: true })}
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
          {stage.recognize && !data.aiEnabled && (
            <p className="text-xs text-muted-foreground">
              Apka może też rozpoznać produkt ze zdjęcia opakowania: włączysz to w Ustawieniach (darmowy klucz Gemini).
            </p>
          )}
          {stage.recognize && data.aiEnabled && (
            <RecognizeButton
              onRecognized={(patch) =>
                setStage({
                  kind: "form",
                  initial: { ...stage.initial, ...patch },
                  info: "Rozpoznane ze zdjęcia. Sprawdź nazwę i kategorię.",
                  // New key, so the form takes the recognized values even when the name did not change
                  rev: (stage.rev ?? 0) + 1,
                })
              }
            />
          )}
          <ProductForm
            key={`${stage.initial.ean || "manual"}-${stage.rev ?? 0}`}
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

// Photo of the packaging -> name, brand and category (AI); the same photo becomes the product photo
function RecognizeButton({ onRecognized }: { onRecognized: (patch: Partial<ProductFormValues>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      let blob: Blob;
      try {
        blob = await compressImage(file);
      } catch {
        toast.error("Nie udało się odczytać zdjęcia");
        return;
      }
      const form = () => {
        const f = new FormData();
        f.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        return f;
      };
      const [recognized, uploaded] = await Promise.all([
        fetch("/api/recognize", { method: "POST", body: form() }).then(async (r) => ({ ok: r.ok, json: await r.json().catch(() => ({})) })),
        fetch("/api/upload", { method: "POST", body: form() }).then(async (r) => (r.ok ? (await r.json()).url : null)).catch(() => null),
      ]).catch(() => [null, null] as const);
      if (!recognized) {
        toast.error("Brak połączenia. Rozpoznawanie działa tylko z internetem.");
        return;
      }
      if (!recognized.ok) {
        toast.error(recognized.json.error || "Nie udało się rozpoznać produktu");
        return;
      }
      const r = recognized.json as { name: string | null; brand: string | null; categoryId: number | null };
      onRecognized({
        ...(r.name && { name: r.name }),
        ...(r.brand && { brand: r.brand }),
        ...(r.categoryId && { categoryId: String(r.categoryId) }),
        ...(uploaded && { imageUrl: uploaded }),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="h-12 w-full" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        {busy ? "Rozpoznaję..." : "Rozpoznaj ze zdjęcia opakowania"}
      </Button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
    </>
  );
}
