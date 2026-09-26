"use client"

import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { APP_VERSION } from "@/lib/changelog"
import type { Person } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface FeedbackItem {
  id: number
  kind: "report" | "error"
  message: string
  personId: number | null
  version: string | null
  page: string | null
  createdAt: string
}

// Beta: report a problem from the app, and see all reports and recorded errors
export function FeedbackSection({ persons }: { persons: Person[] }) {
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<FeedbackItem[] | null>(null)
  const [open, setOpen] = useState(false)

  const load = () =>
    fetch("/api/feedback")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]))

  useEffect(() => {
    load()
  }, [])

  async function send() {
    setBusy(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "report", message, version: APP_VERSION, page: document.referrer ? new URL(document.referrer).pathname : null }),
      })
      if (!res.ok) throw new Error()
      setMessage("")
      toast.success("Dzięki, zgłoszenie zapisane")
      load()
    } catch {
      toast.error("Nie udało się wysłać, spróbuj z internetem")
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    await fetch(`/api/feedback?id=${id}`, { method: "DELETE" }).catch(() => {})
    load()
  }

  const nameOf = (id: number | null) => persons.find((p) => p.id === id)?.name ?? "?"

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">Zgłoś problem albo pomysł</h2>
      <div className="space-y-3 rounded-2xl border p-4">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Co nie działa albo czego brakuje? Np. „skaner nie widzi kodu na herbacie”"
          rows={3}
          className="resize-none"
          aria-label="Opis problemu"
        />
        <Button className="h-11 w-full" onClick={send} disabled={!message.trim() || busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Wyślij zgłoszenie
        </Button>
        {items && items.length > 0 && (
          <div>
            <button onClick={() => setOpen(!open)} className="min-h-11 text-sm font-medium text-primary">
              {open ? "Ukryj zgłoszenia" : `Zgłoszenia i błędy (${items.length})`}
            </button>
            {open && (
              <ul className="mt-1 divide-y rounded-xl border">
                {items.map((f) => (
                  <li key={f.id} className="flex gap-2 p-3 text-sm">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="break-words">
                        {f.kind === "error" && <span className="mr-1 font-semibold text-red-700 dark:text-red-400">Błąd:</span>}
                        {f.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {nameOf(f.personId)} · {new Date(f.createdAt).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {f.version && ` · ${f.version}`}
                        {f.page && ` · ${f.page}`}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(f.id)}
                      aria-label="Usuń zgłoszenie"
                      className="flex size-11 shrink-0 items-center justify-center text-muted-foreground"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
