"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, ServerCrash, Settings, ShoppingBasket, Sparkles, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { sync, useStore } from "@/lib/store"
import { preloadScanner } from "@/components/barcode-scanner"
import { useHasNewVersion } from "@/lib/seen-version"
import type { SyncData } from "@/lib/types"

const NAV = [
  { href: "/", label: "Kupuj", icon: ShoppingBasket },
  { href: "/try", label: "Spróbuj", icon: Sparkles },
  { href: "/add", label: "Dodaj", icon: Plus, primary: true },
  { href: "/settings", label: "Ustawienia", icon: Settings },
]

let warmed = false

// Logged-in part of the app: keeps the local copy fresh and sends logged-out devices to /login
export function AppChrome({ children }: { children: React.ReactNode }) {
  const { status } = useStore()
  const router = useRouter()
  const pathname = usePathname()
  const hasNew = useHasNewVersion()

  useEffect(() => {
    sync()
    const onVisible = () => document.visibilityState === "visible" && sync()
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])

  useEffect(() => {
    if (status === "unauthorized") router.replace("/login")
  }, [status, router])

  // Once per app start, after online data arrived: keep all screens and the scanner for offline use
  useEffect(() => {
    if (status !== "ok" || warmed) return
    warmed = true
    // ready also covers the very first visit, before the worker controls the page
    // Scanner file only where there is no native barcode reader (iPhone)
    const scanner = !(globalThis as { BarcodeDetector?: unknown }).BarcodeDetector
    navigator.serviceWorker?.ready.then((reg) => reg.active?.postMessage({ type: "warm", scanner }))
    preloadScanner()
  }, [status])

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {NAV.map(({ href, label, icon: Icon, primary }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/settings" && pathname === "/changelog")
            const dot = href === "/settings" && hasNew
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {primary ? (
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30">
                    <Icon className="size-5" />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon className="size-5" />
                    {dot && <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />}
                  </span>
                )}
                {label}
                {dot && <span className="sr-only">, są nowe zmiany</span>}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export function PageHeader({
  title,
  back,
  actions,
}: {
  title: React.ReactNode
  back?: boolean
  actions?: React.ReactNode
}) {
  const router = useRouter()
  const { status, data } = useStore()
  return (
    <header className="sticky top-0 z-30 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="flex h-14 items-center gap-2 px-4">
        {back && (
          <button
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
            className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-muted"
            aria-label="Wróć"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">{title}</h1>
        {actions}
      </div>
      {(status === "offline" || status === "error") && data && (
        <div className="flex items-center gap-2 bg-amber-500/15 px-4 py-1.5 text-xs text-amber-800 dark:text-amber-300">
          {status === "offline" ? <WifiOff className="size-3.5" /> : <ServerCrash className="size-3.5" />}
          {status === "offline" ? "Bez internetu" : "Serwer ma problem"}, dane z{" "}
          {new Date(data.syncedAt).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </header>
  )
}

// Renders children only once household data is available (from cache or network)
export function WithData({ children }: { children: (data: SyncData) => React.ReactNode }) {
  const { data, status } = useStore()
  if (data) return <>{children(data)}</>
  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
        <ServerCrash className="size-8 text-muted-foreground" />
        <p className="font-medium">Serwer ma problem</p>
        <p className="text-sm text-muted-foreground">To nie Twój internet. Spróbuj za kilka minut.</p>
      </div>
    )
  }
  if (status === "offline") {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
        <WifiOff className="size-8 text-muted-foreground" />
        <p className="font-medium">Brak internetu</p>
        <p className="text-sm text-muted-foreground">Otwórz apkę raz z internetem, potem zadziała też bez niego.</p>
      </div>
    )
  }
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="size-7 animate-spin text-primary" />
    </div>
  )
}
