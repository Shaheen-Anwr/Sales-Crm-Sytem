import type { LucideIcon } from "lucide-react"

export type LegendItem = {
  label: string
  color: string
  /** The swatch mirrors the mark: a block for bars and areas, a stroke for lines. */
  shape: "block" | "line"
  /** Status series (won/lost) carry an icon too, so their meaning never rests on color. */
  icon?: LucideIcon
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(({ label, color, shape, icon: Icon }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={shape === "line" ? "h-0.5 w-4 rounded-full" : "size-2.5 rounded-[3px]"}
            style={{ background: color }}
          />
          {Icon && <Icon aria-hidden className="size-3.5" style={{ color }} />}
          <span className="text-foreground">{label}</span>
        </li>
      ))}
    </ul>
  )
}
