"use client"

import { CircleCheck, CircleX } from "lucide-react"
import { Bar, BarChart, BarStack, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts"

import { GRID, labelBox, X_AXIS, Y_AXIS } from "@/components/charts/axes"
import { ChartLegend } from "@/components/charts/chart-legend"
import { TooltipCard } from "@/components/charts/tooltip-card"
import { formatCount, formatPercent, formatTick } from "@/lib/format"
import type { TimelinePoint } from "@/lib/types"

const SERIES = [
  { key: "won", label: "Won", color: "var(--status-good)", icon: CircleCheck },
  { key: "lost", label: "Lost", color: "var(--status-critical)", icon: CircleX },
] as const

/**
 * Closed deals per period as won + lost stacks. Won and lost mean good and bad,
 * so they wear the reserved status colors, each with its icon and name.
 */
type Point = TimelinePoint & { label: string; title?: string; partial?: boolean }

export function WonLostChart({ data, height = 260 }: { data: Point[]; height?: number }) {
  const last = data.length - 1
  return (
    <>
      <ChartLegend items={SERIES.map(({ label, color, icon }) => ({ label, color, icon, shape: "block" }))} />
      <BarChart
        responsive
        data={data}
        style={{ width: "100%", height }}
        margin={{ top: 8, right: 44, bottom: 0, left: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...X_AXIS} />
        <YAxis {...Y_AXIS} allowDecimals={false} tickFormatter={(value: number) => formatTick(value, "count")} />
        <Tooltip
          cursor={false}
          content={({ active, payload, label }) => {
            const point = payload?.[0]?.payload as Point | undefined
            if (!active || !point) return null
            return (
              <TooltipCard
                title={String(point.title ?? label)}
                rows={[
                  ...SERIES.map(({ key, label, color }) => ({ key, label, value: formatCount(point[key]), color })),
                  { key: "rate", label: "win rate", value: formatPercent(point.win_rate) },
                ]}
              />
            )
          }}
        />
        {/* The stack's top corners are rounded once; a surface-colored stroke leaves a 2px gap between segments. */}
        <BarStack radius={[4, 4, 0, 0]}>
          {SERIES.map(({ key, label, color }) => (
            <Bar
              key={key}
              dataKey={key}
              name={label}
              fill={color}
              stroke="var(--card)"
              strokeWidth={2}
              maxBarSize={24}
              activeBar={{ fillOpacity: 0.8 }}
              isAnimationActive={false}
            >
              {data.map((point) => (
                <Cell key={point.period} fillOpacity={point.partial ? 0.4 : 1} />
              ))}
              <LabelList
                dataKey={key}
                content={(props) => {
                  const { x, y, width, height } = labelBox(props)
                  if (props.index !== last || height < 14) return null
                  return (
                    <text x={x + width + 6} y={y + height / 2} dy={4} fontSize={12} fill="var(--muted-foreground)">
                      {label}
                    </text>
                  )
                }}
              />
            </Bar>
          ))}
        </BarStack>
      </BarChart>
    </>
  )
}
