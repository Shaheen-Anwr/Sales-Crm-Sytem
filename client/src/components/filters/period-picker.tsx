"use client"

import { CalendarRange, Check, ChevronDown } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { describePeriod, type Period, type PeriodPreset } from "@/lib/periods"
import { cn } from "@/lib/utils"

type Props = {
  presets: PeriodPreset[]
  value: Period | null
  /** The earliest and latest close dates, to bound the custom range. */
  bounds: Period
  onChange: (period: Period | null) => void
}

/** The close-date filter: preset rows first, a custom range below a hairline. */
export function PeriodPicker({ presets, value, bounds, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const label = value ? (presets.find((p) => p.from === value.from && p.to === value.to)?.label ?? describePeriod(value)) : "All time"
  const rows: { label: string; period: Period | null }[] = [
    { label: "All time", period: null },
    ...presets.map(({ label, from, to }) => ({ label, period: { from, to } })),
  ]

  function choose(period: Period | null) {
    onChange(period)
    setOpen(false)
  }

  function toggle(next: boolean) {
    if (next) {
      setFrom(value?.from ?? bounds.from)
      setTo(value?.to ?? bounds.to)
    }
    setOpen(next)
  }

  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("font-normal", value && "bg-accent")}>
          <CalendarRange className="text-muted-foreground" />
          <span className="text-muted-foreground">Closed</span>
          <span className="font-medium">{label}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-0 p-1">
        <div role="listbox" aria-label="Close date">
          {rows.map((row) => {
            const selected = row.period ? row.period.from === value?.from && row.period.to === value?.to : !value
            return (
              <button
                key={row.label}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(row.period)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent/70 focus-visible:bg-accent"
              >
                <Check className={cn("size-4 shrink-0", selected ? "opacity-100" : "opacity-0")} strokeWidth={3} />
                <span className={cn(selected && "font-medium")}>{row.label}</span>
                {row.period && <span className="ml-auto text-xs text-muted-foreground">{describeDays(row.period)}</span>}
              </button>
            )
          })}
        </div>
        <form
          className="mt-1 border-t p-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (from && to && from <= to) choose({ from, to })
          }}
        >
          <p className="mb-2 text-xs font-medium text-muted-foreground">Custom range</p>
          <div className="flex items-center gap-1.5">
            <Input type="date" aria-label="From" value={from} min={bounds.from} max={bounds.to} onChange={(e) => setFrom(e.target.value)} className="h-8 text-xs" />
            <span className="text-muted-foreground">–</span>
            <Input type="date" aria-label="To" value={to} min={bounds.from} max={bounds.to} onChange={(e) => setTo(e.target.value)} className="h-8 text-xs" />
          </div>
          <Button type="submit" size="sm" className="mt-2 w-full" disabled={!from || !to || from > to}>
            Apply range
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function describeDays({ from, to }: Period) {
  return `${from.slice(5).replace("-", "/")} – ${to.slice(5).replace("-", "/")}`
}
