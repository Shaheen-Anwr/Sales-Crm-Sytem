"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { THEME_STORAGE_KEY } from "@/lib/theme"

type Theme = "light" | "dark" | "system"

const CHANGE_EVENT = "themechange"

function storedTheme(): Theme {
  const value = localStorage.getItem(THEME_STORAGE_KEY)
  return value === "light" || value === "dark" ? value : "system"
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light")
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, storedTheme, () => "system" as const)

  // React's development remount resets <html> attributes; put the theme back before paint.
  useLayoutEffect(() => applyTheme(storedTheme()), [])

  // In "system" mode, follow the operating system when it switches.
  useEffect(() => {
    if (theme !== "system") return
    const media = matchMedia("(prefers-color-scheme: dark)")
    const follow = () => applyTheme("system")
    media.addEventListener("change", follow)
    return () => media.removeEventListener("change", follow)
  }, [theme])

  function choose(value: string) {
    const next = value as Theme
    localStorage.setItem(THEME_STORAGE_KEY, next)
    applyTheme(next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={choose}>
          <DropdownMenuRadioItem value="light">
            <Sun /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
