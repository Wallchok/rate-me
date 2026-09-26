"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { normalizeEan } from "@/lib/ean"

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"]

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>
}

// Native API on Android Chrome, WASM (ZXing) on iPhone where Safari has no BarcodeDetector
async function createDetector(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector
  if (Native) {
    const supported = await Native.getSupportedFormats()
    if (supported.includes("ean_13")) return new Native({ formats: FORMATS })
  }
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill")
  // Served from our own origin (copied on npm install), so it works without a CDN.
  // Loaded now, so a missing file shows up as an error instead of a silent camera view.
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? `/zxing/${path}` : prefix + path),
    },
    fireImmediately: true,
  })
  return new BarcodeDetector({ formats: FORMATS as never[] })
}

// Loads the scanner code early (while online), so it also works in a shop without signal
export function preloadScanner() {
  if (!(globalThis as { BarcodeDetector?: unknown }).BarcodeDetector) {
    import("barcode-detector/ponyfill").catch(() => {})
  }
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zeskanuj kod kreskowy</DialogTitle>
        </DialogHeader>
        {/* Mounted per opening, so a previous error or stream never leaks into the next try */}
        {open && <ScannerBody onDetected={onDetected} />}
      </DialogContent>
    </Dialog>
  )
}

function ScannerBody({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)
  const [manual, setManual] = useState("")
  const handleDetected = useEffectEvent((code: string) => onDetected(normalizeEan(code)))

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    async function start() {
      let detector: Detector
      try {
        detector = await createDetector()
      } catch {
        setStarting(false)
        setError("Skaner nie wczytał się bez internetu. Wpisz cyfry spod kodu ręcznie.")
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        })
        // Closed while the permission prompt was open: cleanup already ran, so stop the camera here
        if (stopped || !videoRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        video.srcObject = stream
        await video.play()
        setStarting(false)
      } catch (e) {
        setStarting(false)
        setError(
          (e as Error).name === "NotAllowedError"
            ? "Brak zgody na kamerę. Zezwól w ustawieniach przeglądarki albo wpisz kod ręcznie."
            : "Nie udało się włączyć kamery. Wpisz kod ręcznie."
        )
        return
      }

      const tick = async () => {
        if (stopped || !videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          const code = codes.find((c) => /^\d{8,14}$/.test(c.rawValue))?.rawValue
          if (code) {
            navigator.vibrate?.(60)
            handleDetected(code)
            return
          }
        } catch {
          // Frame not ready yet
        }
        timer = setTimeout(tick, 150)
      }
      tick()
    }
    start()

    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <>
      {error ? (
        <p className="rounded-lg bg-muted p-3 text-sm">{error}</p>
      ) : (
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} playsInline muted className="size-full object-cover" />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-white/80" />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-7 animate-spin text-white" />
            </div>
          )}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (/^\d{8,14}$/.test(manual)) onDetected(normalizeEan(manual))
        }}
      >
        <Input
          inputMode="numeric"
          placeholder="albo wpisz cyfry spod kodu"
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
        />
        <Button type="submit" variant="outline" disabled={!/^\d{8,14}$/.test(manual)}>
          OK
        </Button>
      </form>
    </>
  )
}
