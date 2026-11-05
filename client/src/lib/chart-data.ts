// Shapes API rows into the props of the chart components. Values arrive formatted,
// since Client Components can't receive formatting functions from the server.

import type { ChartTable } from "@/components/chart-card"
import type { BarListItem } from "@/components/charts/bar-list"
import type { LineSeries } from "@/components/charts/multi-line-chart"

import { entityColors } from "./colors"
import { formatCount, formatMoney, formatPercent } from "./format"
import { bucketEnd, periodLabel, type Period } from "./periods"
import type { BreakdownRow, Interval, TimelinePoint } from "./types"

/** "Month", for the first column of a chart's table. */
export function intervalTitle(interval: Interval) {
  return interval[0].toUpperCase() + interval.slice(1)
}

/**
 * Timeline points with axis labels. A point is partial when the period or the data
 * starts or ends inside its week, month or quarter, so its totals cover only part of it.
 */
export function labelPoints<T extends { period: string }>(points: T[], interval: Interval, range: Period | null) {
  return points.map((point) => {
    const label = periodLabel(point.period, interval)
    const partial = range !== null && (point.period < range.from || bucketEnd(point.period, interval) > range.to)
    return { ...point, label, partial, title: partial ? `${label} · partial ${interval}` : label }
  })
}

/** Rows that belong to a group; deals without an account have none. */
export function named(rows: BreakdownRow[]) {
  return rows.filter((row): row is BreakdownRow & { group: string } => row.group !== null)
}

/**
 * The first rows, then the rest folded into one row named by `other`, so a long tail
 * of small groups doesn't crowd the chart. The table view keeps every row.
 */
export function foldTail(rows: BreakdownRow[], keep: number, other: (count: number) => string): BreakdownRow[] {
  if (rows.length <= keep) return rows
  const tail = rows.slice(keep - 1)
  const sum = (key: "deals" | "prospecting" | "engaging" | "won" | "lost" | "revenue" | "pipeline_value") =>
    tail.reduce((total, row) => total + row[key], 0)
  const [won, lost, revenue] = [sum("won"), sum("lost"), sum("revenue")]
  return [
    ...rows.slice(0, keep - 1),
    {
      group: other(tail.length),
      deals: sum("deals"),
      prospecting: sum("prospecting"),
      engaging: sum("engaging"),
      won,
      lost,
      revenue,
      pipeline_value: sum("pipeline_value"),
      win_rate: won + lost ? won / (won + lost) : null,
      avg_deal_size: won ? revenue / won : null,
      avg_days_to_close: null,
    },
  ]
}

/** Bar-list rows of revenue, with deals won and win rate in the hover readout. */
export function revenueItems(rows: BreakdownRow[]): BarListItem[] {
  return named(rows).map((row) => ({
    key: row.group,
    label: row.group,
    value: row.revenue,
    display: formatMoney(row.revenue, { compact: true }),
    details: [
      { key: "won", label: "deals won", value: formatCount(row.won) },
      { key: "rate", label: "win rate", value: formatPercent(row.win_rate) },
    ],
  }))
}

/** Bar-list rows of win rate, drawn against the whole (pass `max={1}`). */
export function winRateItems(rows: BreakdownRow[]): BarListItem[] {
  return named(rows).map((row) => ({
    key: row.group,
    label: row.group,
    value: row.win_rate ?? 0,
    display: formatPercent(row.win_rate),
    details: [
      { key: "won", label: "won", value: formatCount(row.won) },
      { key: "lost", label: "lost", value: formatCount(row.lost) },
    ],
  }))
}

/** The table view of a revenue breakdown. */
export function breakdownTable(label: string, rows: BreakdownRow[]): ChartTable {
  return {
    columns: [
      { label },
      { label: "Revenue", numeric: true },
      { label: "Won", numeric: true },
      { label: "Win rate", numeric: true },
    ],
    rows: named(rows).map((row) => [row.group, formatMoney(row.revenue), formatCount(row.won), formatPercent(row.win_rate)]),
  }
}

/**
 * One timeline per entity (an office, a product series), merged into rows with a
 * column per entity, for a multi-line chart and its table. `all` is every entity
 * there is, so each keeps its color when filters hide the others.
 */
export function revenueByEntity(
  all: string[],
  entities: string[],
  timelines: TimelinePoint[][],
  interval: Interval,
  range: Period | null,
) {
  const colors = entityColors(all)
  const order = entities.map((name, index) => ({ name, index })).sort((a, b) => a.name.localeCompare(b.name))
  const series: LineSeries[] = order.map(({ name, index }) => ({ key: `s${index}`, label: name, color: colors.get(name)! }))
  const byPeriod = timelines.map((points) => new Map(points.map((point) => [point.period, point.revenue])))
  const periods = [...new Set(timelines.flat().map((point) => point.period))].sort()
  const data = labelPoints(
    periods.map((period) => ({
      period,
      ...Object.fromEntries(order.map(({ index }) => [`s${index}`, byPeriod[index].get(period) ?? 0])),
    })),
    interval,
    range,
  )
  const table: ChartTable = {
    columns: [{ label: intervalTitle(interval) }, ...series.map((s) => ({ label: s.label, numeric: true }))],
    rows: data.map((row) => [row.title, ...series.map((s) => formatMoney(Number(row[s.key as keyof typeof row])))]),
  }
  return { series, data, table, colors }
}
