"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Download, LogOut, Pencil, Sparkles, Trash2, UserRound, X } from "lucide-react";
import { APP_VERSION } from "@/lib/changelog";
import { useHasNewVersion } from "@/lib/seen-version";
import { toast } from "sonner";
import { clearLocalData, mutate } from "@/lib/store";
import type { SyncData } from "@/lib/types";
import { PageHeader, WithData } from "@/components/app-chrome";
import { PersonAvatar } from "@/components/person-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Ustawienia" actions={<ThemeToggle />} />
      <WithData>{(d) => <Settings data={d} />}</WithData>
    </>
  );
}

function Settings({ data }: { data: SyncData }) {
  const router = useRouter();
  const me = data.persons.find((p) => p.id === data.meId);
  const hasNew = useHasNewVersion();

  async function logout() {
    // The cookie is httpOnly, only the server can remove it
    const ok = await fetch("/api/auth/logout", { method: "POST" }).then((r) => r.ok, () => false);
    if (!ok) {
      toast.error("Wylogować można tylko z internetem");
      return;
    }
    clearLocalData();
    router.replace("/login");
  }

  return (
    <main className="space-y-6 px-4 pb-6">
      <section className="flex items-center gap-3 rounded-2xl border p-4">
        {me && <PersonAvatar persons={data.persons} person={me} className="size-10 text-base" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Na tym telefonie:</p>
          <p className="truncate font-semibold">{me?.name}</p>
        </div>
        <Link href="/login?switch=1" className={buttonVariants({ variant: "outline", className: "h-11 px-3" })}>
          <UserRound className="size-4" />
          Zmień
        </Link>
      </section>

      <EditableList
        title="Domownicy"
        items={data.persons}
        endpoint="/api/persons"
        canDelete={(id) => id !== data.meId}
        deleteWarning="Usunięcie osoby usuwa też wszystkie jej oceny."
      />

      <EditableList
        title="Kategorie"
        items={data.categories}
        endpoint="/api/categories"
        addPlaceholder="Nowa kategoria"
        canDelete={() => true}
        deleteWarning="Kategorię można usunąć tylko, gdy nie ma w niej produktów."
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Eksport</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { format: "excel", label: "Excel" },
            { format: "csv", label: "CSV" },
            { format: "json", label: "JSON" },
          ].map(({ format, label }) => (
            <a key={format} href={`/api/export?format=${format}`} download className={buttonVariants({ variant: "outline", className: "h-11" })}>
              <Download className="size-4" />
              {label}
            </a>
          ))}
        </div>
      </section>

      <Link href="/changelog" className="flex min-h-12 items-center gap-3 rounded-2xl border px-4">
        <Sparkles className="size-5 text-primary" />
        <span className="flex-1 font-medium">Co nowego</span>
        {hasNew && <span className="size-2.5 rounded-full bg-primary" aria-label="Nowe zmiany" />}
        <span className="text-sm tabular-nums text-muted-foreground">{APP_VERSION}</span>
      </Link>

      <Button variant="ghost" className="h-11 w-full text-destructive" onClick={logout}>
        <LogOut className="size-4" />
        Wyloguj ten telefon
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Dane o produktach ze skanera pochodzą z{" "}
        <a href="https://pl.openfoodfacts.org" className="underline" target="_blank" rel="noreferrer">
          Open Food Facts
        </a>{" "}
        (licencja ODbL). Wersja {APP_VERSION}.
      </p>
    </main>
  );
}

function EditableList({
  title,
  items,
  endpoint,
  addPlaceholder,
  canDelete,
  deleteWarning,
}: {
  title: string;
  items: { id: number; name: string }[];
  endpoint: string;
  addPlaceholder?: string;
  canDelete: (id: number) => boolean;
  deleteWarning: string;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      toast.success(success);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }

  async function saveEdit(id: number) {
    const name = editValue.trim();
    if (!name) return;
    if (await run(() => mutate(`${endpoint}/${id}`, { method: "PUT", json: { name } }), "Zapisano")) setEditingId(null);
  }

  async function remove(id: number) {
    if (await run(() => mutate(`${endpoint}/${id}`, { method: "DELETE" }), "Usunięto")) setConfirmId(null);
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    if (await run(() => mutate(endpoint, { method: "POST", json: { name } }), "Dodano")) setNewName("");
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="divide-y rounded-2xl border">
        {items.map((item) => (
          <div key={item.id} className="px-3 py-1.5">
            {editingId === item.id ? (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEdit(item.id);
                }}
              >
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus className="h-9" />
                <Button type="submit" variant="ghost" size="icon" className="size-10" aria-label="Zapisz">
                  <Check className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-10" onClick={() => setEditingId(null)} aria-label="Anuluj">
                  <X className="size-4" />
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-1">
                <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  onClick={() => {
                    setEditingId(item.id);
                    setEditValue(item.name);
                  }}
                  aria-label={`Zmień nazwę: ${item.name}`}
                >
                  <Pencil className="size-4" />
                </Button>
                {canDelete(item.id) && (
                  <Button variant="ghost" size="icon" className="size-10" onClick={() => setConfirmId(item.id)} aria-label={`Usuń: ${item.name}`}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
            {confirmId === item.id && (
              <div className="mb-1.5 space-y-2 rounded-lg bg-destructive/5 p-3">
                <p className="text-sm">
                  Usunąć <strong>{item.name}</strong>? {deleteWarning}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => remove(item.id)}>
                    Usuń
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>
                    Anuluj
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {addPlaceholder && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={addPlaceholder} className="h-10" />
          <Button type="submit" variant="outline" className="h-10" disabled={!newName.trim()}>
            Dodaj
          </Button>
        </form>
      )}
    </section>
  );
}
