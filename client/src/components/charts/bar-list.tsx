"use client"

import { MarkTooltip } from "@/components/charts/mark-tooltip"
import type { TooltipRow } from "@/components/charts/tooltip-card"
import { cn } from "@/lib/utils"

export type BarListItem = {
  key: string
  label: string
  value: number
  /** The formatted value shown at the bar's tip. */
  display: string
  /** Extra lines for the hover readout, e.g. win rate and deal count. */
  details?: TooltipRow[]
}

type Props = {
  items: BarListItem[]
  /** What the value is, for the readout, e.g. "revenue". */
  valueLabel: string
  ranked?: boolean
  /** The value of a full-length bar. Defaults to the largest value; pass 1 for rates. */
  max?: number
}

/**
 * Horizontal bars for comparing named categories (agents, offices, sectors).
 * The categories have no order of their own, so every bar takes the same color.
 */
export function BarList({ items, valueLabel, ranked = false, max: scale }: Props) {
  const max = scale ?? Math.max(0, ...items.map((item) => item.value))
  return (
    <ol className="-mx-2 space-y-0.5">
      {items.map((item, index) => (
        <li key={item.key}>
          <MarkTooltip
            title={item.label}
            rows={[{ key: "value", label: valueLabel, value: item.display, color: "var(--series-1)" }, ...(item.details ?? [])]}
          >
            <div
              tabIndex={0}
              className={cn(
                "group/row grid items-center gap-3 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50",
                ranked
                  ? "grid-cols-[1rem_minmax(0,min(9.5rem,41%))_1fr_4.5rem]"
                  : "grid-cols-[minmax(0,min(9.5rem,41%))_1fr_4.5rem]",
              )}
            >
              {ranked && <span className="text-right text-xs text-muted-foreground tabular-nums">{index + 1}</span>}
              <span className="truncate text-sm">{item.label}</span>
              <span className={cn("h-2.5 min-w-0", scale !== undefined && "rounded-r-[4px] bg-muted")}>
                <span
                  className="block h-full rounded-r-[4px] bg-series-1 transition-opacity group-hover/row:opacity-80"
                  style={{ width: `${max > 0 ? Math.max(1, (item.value / max) * 100) : 0}%` }}
                />
              </span>
              <span className="text-right text-sm font-medium tabular-nums">{item.display}</span>
            </div>
          </MarkTooltip>
        </li>
      ))}
    </ol>
  )
}
