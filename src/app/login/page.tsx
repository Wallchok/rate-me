"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { clearLocalData, sync } from "@/lib/store";
import type { Person } from "@/lib/types";
import { PersonAvatar } from "@/components/person-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = { kind: "checking" } | { kind: "password" } | { kind: "person"; persons: Person[] };

async function loadPersons(): Promise<Step> {
  const res = await fetch("/api/persons", { cache: "no-store" });
  if (res.status === 401) return { kind: "password" };
  if (!res.ok) throw new Error("Nie udało się połączyć");
  return { kind: "person", persons: await res.json() };
}

// Step 1: household password (once per phone). Step 2: who are you.
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadPersons()
      .then(setStep)
      .catch(() => setStep({ kind: "password" }));
  }, []);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        toast.error((await res.json().catch(() => ({}))).error || "Nie udało się zalogować");
        return;
      }
      setStep(await loadPersons());
    } catch {
      toast.error("Brak połączenia");
    } finally {
      setBusy(false);
    }
  }

  async function choose(body: { personId: number } | { name: string }) {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Nie udało się");
        return;
      }
      // Different person on this phone: drop the old local copy
      clearLocalData();
      await sync();
      router.replace("/");
    } catch {
      toast.error("Brak połączenia");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-3xl font-extrabold text-primary-foreground">
          R
        </div>
        <h1 className="text-2xl font-bold">RateMe</h1>
        <p className="text-sm text-muted-foreground">Co lubicie i co warto kupić</p>
      </div>

      {step.kind === "checking" && (
        <div className="flex justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}

      {step.kind === "password" && (
        <form onSubmit={submitPassword} className="space-y-3">
          <label htmlFor="household-password" className="text-sm font-medium">
            Hasło domu
          </label>
          <Input
            id="household-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12"
            autoFocus
          />
          <Button type="submit" className="h-12 w-full text-base" disabled={!password || busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Dalej
          </Button>
          <p className="text-center text-xs text-muted-foreground">Wpisujesz je raz na tym telefonie.</p>
        </form>
      )}

      {step.kind === "person" && (
        <div className="space-y-4">
          <p className="text-center font-medium">{step.persons.length ? "Kim jesteś?" : "Jak masz na imię?"}</p>
          <div className="grid grid-cols-2 gap-3">
            {step.persons.map((person) => (
              <button
                key={person.id}
                onClick={() => choose({ personId: person.id })}
                disabled={busy}
                className="flex flex-col items-center gap-2 rounded-2xl border p-4 active:bg-muted disabled:opacity-50"
              >
                <PersonAvatar persons={step.persons} person={person} className="size-12 text-xl" />
                <span className="truncate font-medium">{person.name}</span>
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) choose({ name: newName.trim() });
            }}
            className="space-y-2"
          >
            {step.persons.length > 0 && <p className="text-center text-xs text-muted-foreground">Nie ma Cię na liście?</p>}
            <div className="flex gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Twoje imię" className="h-11" />
              <Button type="submit" variant={step.persons.length ? "outline" : "default"} className="h-11" disabled={!newName.trim() || busy}>
                Dodaj
              </Button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
