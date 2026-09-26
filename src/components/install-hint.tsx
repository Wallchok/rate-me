"use client"

import { useSyncExternalStore } from "react"
import { Share, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const DISMISSED_KEY = "rateme:installHintDismissed"

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

// Android/Chrome offers its own install dialog; kept here until the user taps "Zainstaluj"
let installEvent: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    installEvent = e as InstallPromptEvent
    notify()
  })
}

type Hint = "ios" | "android" | null

function currentHint(): Hint {
  if (localStorage.getItem(DISMISSED_KEY)) return null
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true
  if (standalone) return null
  if (installEvent) return "android"
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  return ios ? "ios" : null
}

// "Add to home screen" instructions, shown until installed or dismissed
export function InstallHint() {
  const hint = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    currentHint,
    () => null
  )
  if (!hint) return null

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1")
    notify()
  }

  return (
    <div className="relative mx-4 rounded-2xl border bg-primary/5 p-4 pr-12 text-sm">
      <button onClick={dismiss} aria-label="Zamknij podpowiedź" className="absolute right-1 top-1 flex size-11 items-center justify-center text-muted-foreground">
        <X className="size-4" />
      </button>
      <p className="font-semibold">Dodaj RateMe do ekranu głównego</p>
      {hint === "ios" ? (
        <p className="mt-1 text-muted-foreground">
          W Safari stuknij <Share className="inline size-4 align-text-bottom" /> Udostępnij, a potem „Do ekranu początkowego”. Apka
          otworzy się wtedy jak zwykła aplikacja i zadziała w sklepie bez zasięgu.
        </p>
      ) : (
        <>
          <p className="mt-1 text-muted-foreground">Otworzy się jak zwykła aplikacja i zadziała w sklepie bez zasięgu.</p>
          <Button
            className="mt-3 h-11"
            onClick={async () => {
              await installEvent?.prompt()
              installEvent = null
              dismiss()
            }}
          >
            Zainstaluj
          </Button>
        </>
      )}
    </div>
  )
}
