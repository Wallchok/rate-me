"use client"

import { useSyncExternalStore } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

const NEXT = { system: "light", light: "dark", dark: "system" } as const
const LABEL = { system: "Motyw: jak w telefonie", light: "Motyw: jasny", dark: "Motyw: ciemny" } as const

// Cycles light, dark and back to following the phone setting
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // The saved theme is only known in the browser; render the neutral icon until then
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const current = (mounted && (theme === "light" || theme === "dark") ? theme : "system") as keyof typeof NEXT
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11"
      onClick={() => setTheme(NEXT[current])}
      aria-label={`${LABEL[current]}. Zmień`}
      title={LABEL[current]}
    >
      <Icon className="size-5" />
    </Button>
  )
}
