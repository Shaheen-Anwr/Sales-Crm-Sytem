"use client"

import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"

import { TooltipCard } from "@/components/charts/tooltip-card"
import { formatValue, type ValueFormat } from "@/lib/format"

export type SparkPoint = {
  label: string
  value: number | null
  /** Inside the selected period: drawn in the accent, the rest in gray. */
  current: boolean
}

export function Sparkline({ data, name, format }: { data: SparkPoint[]; name: string; format: ValueFormat }) {
  const points = data.map((point) => ({ ...point, highlight: point.current ? point.value : null }))
  const single = data.filter((point) => point.current).length === 1
  return (
    <LineChart responsive data={points} style={{ width: "100%", height: 36 }} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
      <XAxis dataKey="label" hide />
      <YAxis hide domain={["dataMin", "dataMax"]} />
      <Tooltip
        cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
        allowEscapeViewBox={{ x: true, y: true }}
        wrapperStyle={{ zIndex: 20 }}
        content={({ active, payload, label }) =>
          active && payload?.length ? (
            <TooltipCard
              title={String(label)}
              rows={[{ key: "value", label: name, value: formatValue((payload[0].payload as SparkPoint).value, format) }]}
            />
          ) : null
        }
      />
      <Line dataKey="value" stroke="var(--deemphasis)" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />
      <Line
        dataKey="highlight"
        stroke="var(--series-1)"
        strokeWidth={2}
        dot={single ? { r: 4, fill: "var(--series-1)", strokeWidth: 0 } : false}
        activeDot={{ r: 4, fill: "var(--series-1)", stroke: "var(--card)", strokeWidth: 2 }}
        isAnimationActive={false}
      />
    </LineChart>
  )
}
