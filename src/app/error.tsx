"use client";

import { useEffect } from "react";
import Link from "next/link";
import { APP_VERSION } from "@/lib/changelog";

// Any crash on a screen: say it plainly, offer a retry, and record it for the household to see in settings
export default function ErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "error",
        message: `${error.name}: ${error.message}${error.digest ? ` (digest ${error.digest})` : ""}`,
        version: APP_VERSION,
        page: window.location.pathname + window.location.search,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-lg font-semibold">Coś poszło nie tak</p>
      <p className="text-sm text-muted-foreground">Błąd został zapisany w zgłoszeniach. Spróbuj jeszcze raz.</p>
      <button onClick={() => retry()} className="mt-2 h-12 w-full rounded-lg bg-primary font-medium text-primary-foreground">
        Spróbuj ponownie
      </button>
      <Link href="/" className="flex min-h-11 items-center text-sm text-muted-foreground">
        Wróć na ekran główny
      </Link>
    </main>
  );
}
