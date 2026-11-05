import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  value: string
  /** A series color, tying the tile to its line in a chart on the page. */
  marker?: string
  /** The one number the page leads with, shown at 48px. One per page. */
  hero?: boolean
  delta?: ReactNode
  caption?: ReactNode
  trend?: ReactNode
}

export function KpiTile({ label, value, marker, hero = false, delta, caption, trend }: Props) {
  return (
    // overflow-visible so the sparkline's tooltip isn't clipped by the card
    <Card className={cn("gap-0 overflow-visible", hero && "col-span-2 md:col-span-4 xl:col-span-2")}>
      <CardContent className="flex h-full flex-col">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {marker && <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: marker }} />}
          {label}
        </p>
        <p className={cn("mt-1 font-semibold tracking-tight", hero ? "text-5xl" : "text-2xl")}>{value}</p>
        <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {delta}
          {caption && <span className="text-muted-foreground">{caption}</span>}
        </div>
        {trend && <div className="mt-auto pt-3">{trend}</div>}
      </CardContent>
    </Card>
  )
}

type DeltaProps = {
  current: number | null
  previous: number | null
  comparedTo: string
  /** "relative" shows +12.3%; "points" shows +2.1 pts, for values that already are rates. */
  kind?: "relative" | "points"
  /** Whether a rise is good news (revenue) or bad news (days to close). */
  upIsGood?: boolean
}

/** The change against the previous period, with an arrow so direction never rests on color alone. */
export function Delta({ current, previous, comparedTo, kind = "relative", upIsGood = true }: DeltaProps) {
  if (current === null || previous === null || (kind === "relative" && previous === 0)) {
    return <span className="text-muted-foreground">No data for {comparedTo}</span>
  }
  const change = kind === "points" ? current - previous : (current - previous) / previous
  const good = change === 0 ? null : change > 0 === upIsGood
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight
  const size = Math.abs(change * 100).toFixed(1)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium",
          good === null ? "text-muted-foreground" : good ? "text-delta-good" : "text-delta-bad",
        )}
      >
        <Icon aria-hidden className="size-3.5" />
        <span className="sr-only">{change >= 0 ? "Up" : "Down"}</span>
        {kind === "points" ? `${size} pts` : `${size}%`}
      </span>
      <span className="text-muted-foreground">vs {comparedTo}</span>
    </span>
  )
}

/**
 * In place of a delta, when the data starts inside the comparison period: its totals
 * cover only part of it, so comparing them would overstate the change.
 */
export function PartialComparison({ comparedTo, dataStart }: { comparedTo: string; dataStart: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="rounded-sm text-muted-foreground underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {comparedTo} is partial
        </span>
      </TooltipTrigger>
      <TooltipContent>
        The data starts in {dataStart}, so the totals for {comparedTo} cover only part of it. Rates and averages still compare.
      </TooltipContent>
    </Tooltip>
  )
}
