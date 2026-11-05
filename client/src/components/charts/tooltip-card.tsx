export type TooltipRow = {
  key: string
  label: string
  value: string
  /** The series color, shown as a short line key beside the value. */
  color?: string
}

/** The hover readout of every chart: values lead, series names follow. */
export function TooltipCard({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="min-w-40 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/10">
      <p className="mb-1.5 text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            {row.color && <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: row.color }} />}
            <span className="font-semibold tabular-nums">{row.value}</span>
            <span className="text-muted-foreground">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
