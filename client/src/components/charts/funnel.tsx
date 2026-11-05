"use client"

import { MarkTooltip } from "@/components/charts/mark-tooltip"
import { formatCount, formatPercent } from "@/lib/format"

export type FunnelStage = { key: string; label: string; value: number; description: string }

const STEP_COLORS = ["var(--ordinal-1)", "var(--ordinal-2)", "var(--ordinal-3)", "var(--ordinal-4)"]

/** Ordered stages, so one hue stepping light to dark; each shows how many made it from the stage before. */
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.value ?? 0
  return (
    <ol className="space-y-3.5">
      {stages.map((stage, index) => {
        const previous = stages[index - 1]
        const conversion = previous && previous.value > 0 ? stage.value / previous.value : null
        const share = top > 0 ? stage.value / top : 0
        return (
          <li key={stage.key}>
            <MarkTooltip
              title={stage.label}
              rows={[
                { key: "deals", label: "deals", value: formatCount(stage.value), color: STEP_COLORS[index] },
                { key: "share", label: "of all deals", value: formatPercent(share) },
                ...(conversion !== null && previous
                  ? [{ key: "step", label: `of ${previous.label.toLowerCase()}`, value: formatPercent(conversion) }]
                  : []),
              ]}
            >
              <div tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span>{stage.label}</span>
                  <span className="font-medium tabular-nums">{formatCount(stage.value)}</span>
                </div>
                <div className="h-2.5">
                  <div
                    className="h-full rounded-r-[4px]"
                    style={{ width: `${Math.max(share > 0 ? 1 : 0, share * 100)}%`, background: STEP_COLORS[index] }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {conversion !== null && previous
                    ? `${formatPercent(conversion)} of ${previous.label.toLowerCase()} · ${stage.description}`
                    : stage.description}
                </p>
              </div>
            </MarkTooltip>
          </li>
        )
      })}
    </ol>
  )
}
