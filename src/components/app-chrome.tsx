"use client"

import { useEffect, useState } from "react"
import { APP_VERSION } from "@/lib/changelog"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, ListChecks, Loader2, Plus, ServerCrash, Settings, ShoppingBasket, Sparkles, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { sync, useStore } from "@/lib/store"
import { preloadScanner } from "@/components/barcode-scanner"
import { useHasNewVersion } from "@/lib/seen-version"
import type { SyncData } from "@/lib/types"

const NAV = [
  { href: "/", label: "Kupuj", icon: ShoppingBasket },
  { href: "/list", label: "Lista", icon: ListChecks },
  { href: "/add", label: "Dodaj", icon: Plus, primary: true },
  { href: "/try", label: "Spróbuj", icon: Sparkles },
  { href: "/settings", label: "Ustawienia", icon: Settings },
]

let warmed = false

// "0.10.0" > "0.9.1": compare numbers, not strings
function isNewer(a: string, b: string) {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  }
  return false
}

// The screens come from the phone's cache, so a new release shows up only after a refresh
function UpdateBar({ version }: { version: string }) {
  const [busy, setBusy] = useState(false)

  async function update() {
    setBusy(true)
    const reg = await navigator.serviceWorker?.getRegistration()
    await reg?.update().catch(() => {})
    const worker = reg?.active
    if (worker) {
      // Let the worker store the new screens first; otherwise the reload shows the cached old ones
      await new Promise<void>((resolve) => {
        const channel = new MessageChannel()
        const timeout = setTimeout(resolve, 8000)
        channel.port1.onmessage = () => {
          clearTimeout(timeout)
          resolve()
        }
        const scanner = !(globalThis as { BarcodeDetector?: unknown }).BarcodeDetector
        worker.postMessage({ type: "warm", scanner }, [channel.port2])
      })
    }
    window.location.reload()
  }

  return (
    <button
      onClick={update}
      disabled={busy}
      className="flex min-h-11 w-full items-center justify-center gap-2 bg-primary px-4 pt-[env(safe-area-inset-top)] text-sm font-medium text-primary-foreground"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      Jest nowa wersja {version}, stuknij, aby odświeżyć
    </button>
  )
}

// Logged-in part of the app: keeps the local copy fresh and sends logged-out devices to /login
export function AppChrome({ children }: { children: React.ReactNode }) {
  const { status, data } = useStore()
  const pathname = usePathname()
  const hasNew = useHasNewVersion()
  const toBuy = data?.list.filter((i) => !i.boughtAt).length ?? 0

  useEffect(() => {
    sync()
    const onVisible = () => document.visibilityState === "visible" && sync()
    // Back in range: send what was changed offline
    const onOnline = () => sync()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onOnline)
    // While the app is on screen, pick up changes from the other phone (list, ratings) every 15 s
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) sync()
    }, 15000)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onOnline)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthorized") window.location.replace("/login")
  }, [status])

  // Local copy cleared (e.g. after switching person) while the last sync said "ok": fetch again
  useEffect(() => {
    if (status === "ok" && !data) sync()
  }, [status, data])

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

  // Not without signal: refreshing needs the network, the tap would only show old screens again
  const newVersion =
    status !== "offline" && data?.appVersion && data.appVersion !== APP_VERSION && isNewer(data.appVersion, APP_VERSION)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      {newVersion && <UpdateBar version={data!.appVersion!} />}
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {NAV.map(({ href, label, icon: Icon, primary }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href) ||
                  (href === "/settings" && pathname === "/changelog") ||
                  (href === "/try" && pathname === "/taste")
            const dot = href === "/settings" && hasNew
            const count = href === "/list" ? toBuy : 0
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
                    {count > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                        {count}
                      </span>
                    )}
                  </span>
                )}
                {label}
                {dot && <span className="sr-only">, są nowe zmiany</span>}
                {count > 0 && <span className="sr-only">, do kupienia: {count}</span>}
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
