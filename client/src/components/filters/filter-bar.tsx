"use client"

import { LoaderCircle, RotateCcw, SlidersHorizontal } from "lucide-react"

import { IntervalToggle } from "@/components/filters/interval-toggle"
import { PeriodPicker } from "@/components/filters/period-picker"
import { useUrlParams, type ParamChanges } from "@/components/filters/use-url-params"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { DIMENSION_KEYS, FILTER_KEYS, isoDate } from "@/lib/filters"
import { capitalize } from "@/lib/format"
import type { Period, PeriodPreset } from "@/lib/periods"
import type { Product, SalesAgent } from "@/lib/types"
import { cn } from "@/lib/utils"

const ALL = "__all__"

type Props = {
  agents: SalesAgent[]
  products: Product[]
  sectors: string[]
  presets: PeriodPreset[]
  bounds: Period
  /** Show the week / month / quarter toggle, for pages with charts over time. */
  interval?: boolean
}

/** One row of filters above everything they scope; every chart on the page follows them. */
export function FilterBar({ agents, products, sectors, presets, bounds, interval = false }: Props) {
  const { params, update, isPending } = useUrlParams()
  const office = params.get("regional_office")
  const manager = params.get("manager")
  const agent = params.get("sales_agent")
  const series = params.get("series")
  const product = params.get("product")
  const from = isoDate(params.get("close_date__gte"))
  const to = isoDate(params.get("close_date__lte"))

  // Narrow each list to what the filters to its left allow.
  const offices = unique(agents.map((a) => a.regional_office))
  const inOffice = agents.filter((a) => !office || a.regional_office === office)
  const managers = unique(inOffice.map((a) => a.manager))
  const agentNames = unique(inOffice.filter((a) => !manager || a.manager === manager).map((a) => a.sales_agent))
  const seriesNames = unique(products.map((p) => p.series))
  const productNames = unique(products.filter((p) => !series || p.series === series).map((p) => p.product))

  /** Apply a change and drop any narrower filter it rules out (e.g. an agent from another office). */
  function change(changes: ParamChanges) {
    const next = (key: string) => (key in changes ? (changes[key] ?? null) : params.get(key))
    const inNextOffice = (a: SalesAgent) => !next("regional_office") || a.regional_office === next("regional_office")
    if (next("manager") && !agents.some((a) => inNextOffice(a) && a.manager === next("manager"))) {
      changes.manager = null
    }
    const underNextManager = (a: SalesAgent) => !next("manager") || a.manager === next("manager")
    if (next("sales_agent") && !agents.some((a) => inNextOffice(a) && underNextManager(a) && a.sales_agent === next("sales_agent"))) {
      changes.sales_agent = null
    }
    if (next("product") && next("series") && !products.some((p) => p.series === next("series") && p.product === next("product"))) {
      changes.product = null
    }
    update(changes)
  }

  const active = FILTER_KEYS.some((key) => params.get(key))
  const dimensions = DIMENSION_KEYS.filter((key) => params.get(key)).length
  const reset = () => update(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])))

  const selects = (className?: string) => (
    <>
      <FilterSelect label="Office" value={office} options={offices} onChange={(v) => change({ regional_office: v })} className={className} />
      <FilterSelect label="Manager" value={manager} options={managers} onChange={(v) => change({ manager: v })} className={className} />
      <FilterSelect label="Agent" value={agent} options={agentNames} onChange={(v) => change({ sales_agent: v })} className={className} />
      <FilterSelect label="Series" value={series} options={seriesNames} onChange={(v) => change({ series: v })} className={className} />
      <FilterSelect label="Product" value={product} options={productNames} onChange={(v) => change({ product: v })} className={className} />
      <FilterSelect
        label="Sector"
        value={params.get("sector")}
        options={sectors}
        display={capitalize}
        onChange={(v) => change({ sector: v })}
        className={className}
      />
    </>
  )

  return (
    <div
      role="group"
      aria-label="Filters"
      data-pending={isPending || undefined}
      className="mb-6 flex flex-wrap items-center gap-2"
    >
      <PeriodPicker
        presets={presets}
        bounds={bounds}
        value={from && to ? { from, to } : null}
        onChange={(period) => change({ close_date__gte: period?.from, close_date__lte: period?.to })}
      />
      {/* Phones get one button for the six dimension filters, which open in a sheet. */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className={cn("font-normal sm:hidden", dimensions > 0 && "bg-accent")}>
            <SlidersHorizontal className="text-muted-foreground" />
            Filters
            {dimensions > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground tabular-nums">
                {dimensions}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85svh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Every chart on the page follows them.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 overflow-y-auto px-4">{selects("h-9 w-full max-w-none [&>span:first-child]:mr-auto")}</div>
          <SheetFooter className="flex-row">
            <Button variant="outline" className="flex-1" disabled={!active} onClick={reset}>
              <RotateCcw /> Reset
            </Button>
            <SheetClose asChild>
              <Button className="flex-1">Done</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="hidden sm:contents">{selects()}</div>
      {active && (
        <Button variant="ghost" size="sm" onClick={reset} className="hidden sm:inline-flex">
          <RotateCcw /> Reset
        </Button>
      )}
      <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {isPending && (
          <>
            <LoaderCircle className="size-3.5 animate-spin" /> Updating
          </>
        )}
      </span>
      {interval && (
        <div className="ml-auto">
          <IntervalToggle />
        </div>
      )}
    </div>
  )
}

export function FilterSelect({
  label,
  value,
  options,
  display = (option) => option,
  onChange,
  className,
}: {
  label: string
  value: string | null
  options: string[]
  /** How an option reads, when that differs from its value. */
  display?: (option: string) => string
  onChange: (value: string | null) => void
  className?: string
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
      <SelectTrigger size="sm" aria-label={label} className={cn("max-w-56 gap-1", value && "bg-accent", className)}>
        <span className="text-muted-foreground">{label}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        <SelectItem value={ALL}>All</SelectItem>
        <SelectSeparator />
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {display(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}
