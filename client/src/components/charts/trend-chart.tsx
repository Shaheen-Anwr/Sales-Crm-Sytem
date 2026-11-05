"use client"

import { Area, AreaChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from "recharts"

import { GRID, labelBox, X_AXIS, Y_AXIS } from "@/components/charts/axes"
import { TooltipCard } from "@/components/charts/tooltip-card"
import { formatTick, formatValue, type ValueFormat } from "@/lib/format"

/** `title` is the tooltip's heading; a `partial` point covers only part of its period. */
type Point = { label: string; title?: string; partial?: boolean } & Record<string, unknown>

type Props = {
  data: Point[]
  dataKey: string
  /** What the series is, for the tooltip, e.g. "Revenue". The card title names it, so no legend. */
  name: string
  format: ValueFormat
  height?: number
}

/** One series over time: a 2px line over a 10% wash, the latest value labeled at its end. */
export function TrendChart({ data, dataKey, name, format, height = 260 }: Props) {
  const last = data.length - 1
  return (
    <AreaChart responsive data={data} style={{ width: "100%", height }} margin={{ top: 12, right: 64, bottom: 0, left: 0 }}>
      <CartesianGrid {...GRID} />
      <XAxis dataKey="label" {...X_AXIS} />
      <YAxis {...Y_AXIS} tickFormatter={(value: number) => formatTick(value, format)} />
      <Tooltip
        cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
        content={({ active, payload, label }) =>
          active && payload?.length ? (
            <TooltipCard
              title={String((payload[0].payload as Point).title ?? label)}
              rows={[{ key: dataKey, label: name, value: formatValue(Number(payload[0].value), format), color: "var(--series-1)" }]}
            />
          ) : null
        }
      />
      <Area
        dataKey={dataKey}
        name={name}
        type="linear"
        stroke="var(--series-1)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="var(--series-1)"
        fillOpacity={0.1}
        dot={(props) => <PartialDot key={props.index} {...props} color="var(--series-1)" />}
        activeDot={{ r: 4, fill: "var(--series-1)", stroke: "var(--card)", strokeWidth: 2 }}
        isAnimationActive={false}
      >
        <LabelList
          dataKey={dataKey}
          content={(props) => {
            if (props.index !== last) return null
            const { x, y } = labelBox(props)
            return (
              <g>
                {data[last]?.partial ? (
                  <circle cx={x} cy={y} r={4} fill="var(--card)" stroke="var(--series-1)" strokeWidth={2} />
                ) : (
                  <circle cx={x} cy={y} r={4} fill="var(--series-1)" stroke="var(--card)" strokeWidth={2} />
                )}
                <text x={x + 10} y={y} dy={4} fontSize={12} fontWeight={600} fill="var(--foreground)">
                  {formatValue(Number(props.value), format)}
                </text>
              </g>
            )
          }}
        />
      </Area>
    </AreaChart>
  )
}

/** A hollow marker on a point that covers only part of its period; nothing on the others. */
export function PartialDot({ cx, cy, payload, color }: { cx?: number; cy?: number; payload?: { partial?: boolean }; color: string }) {
  if (!payload?.partial || cx === undefined || cy === undefined) return <g />
  return <circle cx={cx} cy={cy} r={4} fill="var(--card)" stroke={color} strokeWidth={2} />
}
