// Date ranges for the period filter. Dates are ISO strings ("2017-04-01") and
// ranges include both ends. All math is in UTC, so it never depends on the
// time zone of the server or the browser.

import { formatDate, formatMonth } from "./format"
import type { Interval } from "./types"

export type Period = { from: string; to: string }
export type PeriodPreset = Period & { label: string }

const DAY = 86_400_000

const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10)
const yearMonth = (iso: string) => [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1] as const

/** First / last day of a month; the month may overflow (-1 is last December). */
const monthStart = (year: number, month: number) => toIso(Date.UTC(year, month, 1))
const monthEnd = (year: number, month: number) => toIso(Date.UTC(year, month + 1, 0))

export function endOfMonth(iso: string) {
  const [year, month] = yearMonth(iso)
  return monthEnd(year, month)
}

/** Whether the month starting on `monthIso` overlaps the period. */
export function monthInPeriod(monthIso: string, period: Period) {
  return monthIso <= period.to && endOfMonth(monthIso) >= period.from
}

/** The quarters, then the years, between two months (ISO dates), most recent first. */
export function periodPresets(firstMonth: string, lastMonth: string): PeriodPreset[] {
  const [firstYear, firstMonthIndex] = yearMonth(firstMonth)
  const [lastYear, lastMonthIndex] = yearMonth(lastMonth)
  const presets: PeriodPreset[] = []
  const lastQuarter = lastYear * 4 + Math.floor(lastMonthIndex / 3)
  const firstQuarter = firstYear * 4 + Math.floor(firstMonthIndex / 3)
  for (let index = lastQuarter; index >= firstQuarter; index--) {
    const year = Math.floor(index / 4)
    const quarter = index % 4
    presets.push({
      label: `Q${quarter + 1} ${year}`,
      from: monthStart(year, quarter * 3),
      to: monthEnd(year, quarter * 3 + 2),
    })
  }
  for (let year = lastYear; year >= firstYear; year--) {
    presets.push({ label: String(year), from: monthStart(year, 0), to: monthEnd(year, 11) })
  }
  return presets
}

function wholeMonths({ from, to }: Period) {
  if (!from.endsWith("-01") || to !== endOfMonth(to)) return null
  const [fromYear, fromMonth] = yearMonth(from)
  const [toYear, toMonth] = yearMonth(to)
  return (toYear - fromYear) * 12 + toMonth - fromMonth + 1
}

/** The period of the same length just before: the previous quarter for a quarter, and so on. */
export function previousPeriod(period: Period): Period {
  const months = wholeMonths(period)
  if (months) {
    const [year, month] = yearMonth(period.from)
    return { from: monthStart(year, month - months), to: monthEnd(year, month - 1) }
  }
  const days = (toTime(period.to) - toTime(period.from)) / DAY + 1
  const end = toTime(period.from) - DAY
  return { from: toIso(end - (days - 1) * DAY), to: toIso(end) }
}

/** "Q2 2017", "2017", "Apr 2017" or "Apr 3, 2017 – May 9, 2017". */
export function describePeriod(period: Period) {
  const months = wholeMonths(period)
  const [year, month] = yearMonth(period.from)
  if (months === 12 && month === 0) return String(year)
  if (months === 3 && month % 3 === 0) return `Q${month / 3 + 1} ${year}`
  if (months === 1) return formatMonth(period.from)
  return `${formatDate(period.from)} – ${formatDate(period.to)}`
}

/** The last day of the week, month or quarter that starts on `start`. */
export function bucketEnd(start: string, interval: Interval) {
  if (interval === "week") return toIso(toTime(start) + 6 * DAY)
  const [year, month] = yearMonth(start)
  return monthEnd(year, month + (interval === "quarter" ? 2 : 0))
}

/** Where two ranges overlap; a null range is unbounded. */
export function overlap(a: Period | null, b: Period | null): Period | null {
  if (!a || !b) return a ?? b
  return { from: a.from > b.from ? a.from : b.from, to: a.to < b.to ? a.to : b.to }
}

/** The months that have closed deals, as a range of days. */
export function dataRange(months: { period: string }[]): Period | null {
  return months.length ? { from: months[0].period, to: endOfMonth(months.at(-1)!.period) } : null
}

/** How a timeline period reads on an axis: "Q2 2017", "Apr 2017", or the date of the week's Monday. */
export function periodLabel(start: string, interval: Interval) {
  if (interval === "month") return formatMonth(start)
  if (interval === "week") return formatDate(start)
  const [year, month] = yearMonth(start)
  return `Q${Math.floor(month / 3) + 1} ${year}`
}
