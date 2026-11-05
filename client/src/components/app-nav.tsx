"use client"

import { Building2, ChartNoAxesColumn, Handshake, LayoutDashboard, Menu, Package, Users } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { FILTER_KEYS } from "@/lib/filters"
import { cn } from "@/lib/utils"

const PAGES = [
  { href: "/", label: "Overview", icon: LayoutDashboard, keepsFilters: true },
  { href: "/deals", label: "Deals", icon: Handshake, keepsFilters: false },
  { href: "/team", label: "Team", icon: Users, keepsFilters: true },
  { href: "/products", label: "Products", icon: Package, keepsFilters: true },
  { href: "/accounts", label: "Accounts", icon: Building2, keepsFilters: true },
] as const

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md px-2 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <span className="flex size-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <ChartNoAxesColumn className="size-4" strokeWidth={2.5} />
      </span>
      <span className="font-semibold tracking-tight">Sales CRM</span>
    </Link>
  )
}

/** The page links. On the analytics pages they carry the current filters along. */
function NavLinks({ query = "", onNavigate }: { query?: string; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <ul className="space-y-0.5">
      {PAGES.map(({ href, label, icon: Icon, keepsFilters }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
        return (
          <li key={href}>
            <Link
              href={keepsFilters && query ? `${href}?${query}` : href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                active && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-sidebar-primary")} />
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function NavLinksWithFilters(props: { onNavigate?: () => void }) {
  const searchParams = useSearchParams()
  const kept = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = searchParams.get(key)
    if (value) kept.set(key, value)
  }
  return <NavLinks query={kept.toString()} {...props} />
}

function Navigation(props: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main">
      <Suspense fallback={<NavLinks {...props} />}>
        <NavLinksWithFilters {...props} />
      </Suspense>
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 lg:flex">
      <Brand />
      <div className="mt-6 flex-1">
        <Navigation />
      </div>
      <div className="flex items-center justify-between border-t pt-3 pl-2">
        <span className="text-xs text-muted-foreground">Data from the Django API</span>
        <ThemeToggle />
      </div>
    </aside>
  )
}

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/90 px-4 py-2.5 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-sidebar px-3">
          <SheetHeader className="px-0">
            <SheetTitle asChild>
              <div>
                <Brand />
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Pages of the CRM dashboard</SheetDescription>
          </SheetHeader>
          <Navigation onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <Brand />
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  )
}
