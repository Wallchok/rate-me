"use client"

import Link from "next/link"
import { User, Settings } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

interface Person {
  id: number
  name: string
}

interface HeaderProps {
  persons: Person[]
  selectedPersonId: number | null
  onPersonChange: (personId: number) => void
}

export function Header({ persons, selectedPersonId, onPersonChange }: HeaderProps) {
  const selectedPerson = persons.find((p) => p.id === selectedPersonId)

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            R
          </div>
          <h1 className="text-lg font-bold tracking-tight">RateMe</h1>
        </div>

        <div className="flex items-center gap-2">
          {persons.length > 0 && (
            <div className="relative">
              <select
                value={selectedPersonId ?? ""}
                onChange={(e) => onPersonChange(parseInt(e.target.value))}
                className="appearance-none rounded-full bg-primary/10 text-primary font-medium text-sm pl-8 pr-3 py-1.5 cursor-pointer hover:bg-primary/15 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {selectedPerson?.name?.charAt(0)?.toUpperCase() ?? <User className="size-3" />}
              </div>
            </div>
          )}

          <Link
            href="/settings"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Ustawienia"
          >
            <Settings className="size-4" />
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
