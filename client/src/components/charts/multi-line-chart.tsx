"use client"

import { CartesianGrid, LabelList, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"

import { GRID, labelBox, X_AXIS, Y_AXIS } from "@/components/charts/axes"
import { ChartLegend } from "@/components/charts/chart-legend"
import { PartialDot } from "@/components/charts/trend-chart"
import { TooltipCard } from "@/components/charts/tooltip-card"
import { formatTick, formatValue, type ValueFormat } from "@/lib/format"

export type LineSeries = { key: string; label: string; color: string }

type Props = {
  data: ({ label: string; title?: string; partial?: boolean } & Record<string, unknown>)[]
  /** In a fixed order, with colors that follow the entity (never its rank). */
  series: LineSeries[]
  format: ValueFormat
  height?: number
}

/** A few series over time. The legend names every line; end labels name them where they don't collide. */
export function MultiLineChart({ data, series, format, height = 260 }: Props) {
  const last = data.length - 1
  const end = (key: string) => Number(data[last]?.[key] ?? 0)
  const max = Math.max(1, ...data.flatMap((point) => series.map((s) => Number(point[s.key] ?? 0))))
  // An end label within 8% of the chart height of another would overlap it: leave both to the legend.
  const labelled = new Set(
    series.filter((s) => series.every((other) => other === s || Math.abs(end(s.key) - end(other.key)) / max > 0.08)).map((s) => s.key),
  )

  return (
    <>
      <ChartLegend items={series.map(({ label, color }) => ({ label, color, shape: "line" }))} />
      <LineChart
        responsive
        data={data}
        style={{ width: "100%", height }}
        margin={{ top: 8, right: labelled.size ? 72 : 16, bottom: 0, left: 0 }}
      >
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...X_AXIS} />
        <YAxis {...Y_AXIS} tickFormatter={(value: number) => formatTick(value, format)} />
        <Tooltip
          cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            const point = payload?.[0]?.payload as Record<string, unknown> | undefined
            if (!active || !point) return null
            return (
              <TooltipCard
                title={String(point.title ?? label)}
                rows={series.map((s) => ({ key: s.key, label: s.label, value: formatValue(Number(point[s.key] ?? 0), format), color: s.color }))}
              />
            )
          }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.label}
            type="linear"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={(props) => <PartialDot key={props.index} {...props} color={s.color} />}
            activeDot={{ r: 4, fill: s.color, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          >
            {labelled.has(s.key) && (
              <LabelList
                dataKey={s.key}
                content={(props) => {
                  if (props.index !== last) return null
                  const { x, y } = labelBox(props)
                  return (
                    <text x={x + 8} y={y} dy={4} fontSize={12} fill="var(--muted-foreground)">
                      {s.label}
                    </text>
                  )
                }}
              />
            )}
          </Line>
        ))}
      </LineChart>
    </>
  )
}
