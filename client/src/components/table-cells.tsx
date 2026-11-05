import { Circle, CircleCheck, CircleDot, CircleX } from "lucide-react"

import { initials } from "@/lib/format"
import type { DealStage } from "@/lib/types"
import { cn } from "@/lib/utils"

/** A number with a thin bar beside it, for comparing rows of a table at a glance. */
export function InlineBar({ value, max, display }: { value: number; max: number; display: string }) {
  const width = max > 0 && value > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <span className="inline-flex items-center justify-end gap-3">
      <span aria-hidden className="hidden h-1.5 w-16 sm:block">
        <span className="block h-full rounded-r-[3px] bg-series-1" style={{ width: `${width}%` }} />
      </span>
      <span className="min-w-[5.5rem] tabular-nums">{display}</span>
    </span>
  )
}

export function Person({ name, detail }: { name: string; detail?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
      >
        {initials(name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{name}</span>
        {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
    </span>
  )
}

const STAGE_STYLE: Record<DealStage, { icon: typeof Circle; className: string }> = {
  Prospecting: { icon: Circle, className: "text-muted-foreground" },
  Engaging: { icon: CircleDot, className: "text-muted-foreground" },
  Won: { icon: CircleCheck, className: "text-status-good" },
  Lost: { icon: CircleX, className: "text-status-critical" },
}

/** A deal's stage. Won and lost use the status colors, always with an icon and the stage's name. */
export function StageBadge({ stage }: { stage: DealStage }) {
  const { icon: Icon, className } = STAGE_STYLE[stage]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
      <Icon aria-hidden className={cn("size-3.5", className)} />
      {stage}
    </span>
  )
}
