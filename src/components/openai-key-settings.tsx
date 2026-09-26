"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface KeyStatus {
  configured: boolean
  source: "env" | "app" | null
  hint: string | null
}

// Write-only field for the OpenAI key used by "Rozpoznaj ze zdjęcia opakowania"
export function OpenAiKeySettings() {
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [failed, setFailed] = useState(false)
  const [key, setKey] = useState("")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch("/api/settings/openai")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStatus)
      .catch(() => setFailed(true))
  }, [])

  async function call(method: "PUT" | "DELETE") {
    setBusy(true)
    try {
      const res = await fetch("/api/settings/openai", {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PUT" ? JSON.stringify({ key }) : undefined,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error || "Nie udało się zapisać")
        return
      }
      setStatus(json)
      setKey("")
      toast.success(method === "PUT" ? "Klucz działa i jest zapisany" : "Klucz usunięty")
    } catch {
      toast.error("Brak połączenia")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">Rozpoznawanie ze zdjęcia</h2>
      <div className="space-y-3 rounded-2xl border p-4">
        {failed && <p className="text-sm text-muted-foreground">Ustawienia widać tylko z internetem.</p>}
        {status && (
          <p className="text-sm">
            {status.configured ? (
              <>
                ✅ Włączone, klucz kończy się na <span className="font-mono">…{status.hint}</span>
                {status.source === "env" && " (ustawiony na serwerze)"}
              </>
            ) : (
              "Wyłączone. Wklej klucz OpenAI, żeby apka rozpoznawała produkty ze zdjęcia opakowania."
            )}
          </p>
        )}
        {status && status.source !== "env" && (
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (key.trim()) call("PUT")
              }}
            >
              <div className="relative flex-1">
                <Input
                  type={show ? "text" : "password"}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={status.configured ? "Nowy klucz sk-..." : "sk-..."}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-11 pr-11"
                  aria-label="Klucz OpenAI"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Ukryj klucz" : "Pokaż klucz"}
                  className="absolute right-0.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center text-muted-foreground"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button type="submit" className="h-11" disabled={!key.trim() || busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Zapisz
              </Button>
            </form>
            {status.configured && (
              <button onClick={() => call("DELETE")} disabled={busy} className="min-h-11 text-sm text-muted-foreground">
                Usuń klucz
              </button>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Klucz utworzysz na{" "}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="underline">
            platform.openai.com/api-keys
          </a>
          . Jest zapisany zaszyfrowany i nie da się go tu podejrzeć. Jedno zdjęcie kosztuje ułamek grosza.
        </p>
      </div>
    </section>
  )
}
