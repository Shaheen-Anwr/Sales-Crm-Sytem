// Number and date formatting. A fixed locale and time zone make the server and
// the browser format identically, so hydration never sees a mismatch.

const LOCALE = "en-US"

const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const compactMoney = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})
const count = new Intl.NumberFormat(LOCALE)
const compactCount = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 })
const percent = new Intl.NumberFormat(LOCALE, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 })
const percentTick = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
const month = new Intl.DateTimeFormat(LOCALE, { month: "short", year: "numeric", timeZone: "UTC" })

type Value = number | null | undefined

const dash = (value: Value) => value === null || value === undefined || Number.isNaN(value)

export function formatMoney(value: Value, { compact = false } = {}) {
  return dash(value) ? "—" : (compact ? compactMoney : money).format(value!)
}

export function formatCount(value: Value, { compact = false } = {}) {
  return dash(value) ? "—" : (compact ? compactCount : count).format(value!)
}

export function formatPercent(value: Value) {
  return dash(value) ? "—" : percent.format(value!)
}

export function formatDays(value: Value) {
  return dash(value) ? "—" : `${value!.toFixed(1)} days`
}

/** "2017-03-01" -> "Mar 1, 2017" */
export function formatDate(iso: string | null | undefined) {
  return iso ? date.format(new Date(`${iso}T00:00:00Z`)) : "—"
}

/** "2017-03-01" -> "Mar 2017" */
export function formatMonth(iso: string) {
  return month.format(new Date(`${iso}T00:00:00Z`))
}

export type ValueFormat = "money" | "compactMoney" | "count" | "percent" | "days"

/** Formatters by name, for Client Components (functions can't be passed to them as props). */
export function formatValue(value: Value, format: ValueFormat) {
  switch (format) {
    case "money":
      return formatMoney(value)
    case "compactMoney":
      return formatMoney(value, { compact: true })
    case "count":
      return formatCount(value)
    case "percent":
      return formatPercent(value)
    case "days":
      return formatDays(value)
  }
}

/** Short axis ticks: 0 / 1K / 2.5M (money gets a $). */
export function formatTick(value: number, format: ValueFormat) {
  if (format === "percent") return percentTick.format(value)
  if (format === "days") return `${value}d`
  const short = compactCount.format(value)
  return format === "money" || format === "compactMoney" ? `$${short}` : short
}

/** "1 product", "4 products" */
export function plural(count: number, noun: string) {
  return `${formatCount(count)} ${noun}${count === 1 ? "" : "s"}`
}

/** "technology" -> "Technology", for the sector names, which are stored in lower case. */
export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
