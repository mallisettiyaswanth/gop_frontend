"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { MonitorIcon, SunIcon, MoonIcon } from "lucide-react"
import { cn } from "cn"

const options = [
  { value: "system", icon: MonitorIcon, label: "System" },
  { value: "light", icon: SunIcon, label: "Light" },
  { value: "dark", icon: MoonIcon, label: "Dark" },
] as const

export function ThemeToggleGroup() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border p-1">
      {options.map((option) => {
        const Icon = option.icon
        const active = mounted && theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-muted text-foreground"
            )}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
