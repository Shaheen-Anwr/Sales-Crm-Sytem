// The dashboard's filters live in the URL, so a filtered view can be shared and
// the back button works. The query parameters are named like the API's own
// (regional_office, close_date__gte, ...), so pages pass them straight through.

import type { Query } from "./api"
import type { Period } from "./periods"
import type { Interval } from "./types"

export type SearchParams = Record<string, string | string[] | undefined>

/** The dimension filters, in the order the filter bar shows them. */
export const DIMENSION_KEYS = ["regional_office", "manager", "sales_agent", "series", "product", "sector"] as const
export const PERIOD_KEYS = ["close_date__gte", "close_date__lte"] as const
export const FILTER_KEYS = [...PERIOD_KEYS, ...DIMENSION_KEYS] as const

export function first(value: string | string[] | undefined | null) {
  return (Array.isArray(value) ? value[0] : value) ?? undefined
}

/** The value if it is a real calendar date written as "2017-04-01", otherwise undefined. */
export function isoDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const time = Date.parse(`${value}T00:00:00Z`)
  // Date.parse rolls impossible days over ("2017-02-30" becomes March 2), so compare back.
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value ? value : undefined
}

/** The deal filters in a page's search params, ready to pass to the API. */
export function dealFilters(params: SearchParams, { period = true } = {}): Query {
  const query: Query = {}
  for (const key of DIMENSION_KEYS) {
    const value = first(params[key])
    if (value) query[key] = value
  }
  const range = period ? periodOf(params) : null
  if (range) {
    query.close_date__gte = range.from
    query.close_date__lte = range.to
  }
  return query
}

/**
 * The close-date period, as the period picker sets it: both ends, both real dates.
 * Anything else (a hand-edited URL with one end, or "2017-13-45") counts as all time.
 */
export function periodOf(params: SearchParams): Period | null {
  const from = isoDate(first(params.close_date__gte))
  const to = isoDate(first(params.close_date__lte))
  return from && to ? { from, to } : null
}

export function parseInterval(value: string | undefined): Interval {
  return value === "week" || value === "quarter" ? value : "month"
}
