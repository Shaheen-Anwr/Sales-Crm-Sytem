// Data from the Django CRM API. These functions run on the server (in Server
// Components), so the browser never talks to the API directly.

import type {
  Account,
  BreakdownRow,
  DealMetrics,
  FilterOptions,
  GroupBy,
  Interval,
  Opportunity,
  Paginated,
  Product,
  SalesAgent,
  TimelinePoint,
} from "./types"

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000"

export type Query = Record<string, string | string[] | number | undefined>

/** GET a JSON resource. Responses are not cached, so pages always show current data. */
async function get<T>(path: string, query: Query = {}): Promise<T> {
  const url = new URL(`/api/${path}`, API_URL)
  for (const [key, value] of Object.entries(query)) {
    for (const item of [value].flat()) {
      if (item !== undefined && item !== "") url.searchParams.append(key, String(item))
    }
  }
  const response = await fetch(url, { headers: { Accept: "application/json" } }).catch((cause) => {
    throw new Error(`Could not reach the CRM API at ${API_URL}. Is the Django server running?`, { cause })
  })
  if (!response.ok) {
    throw new Error(`The CRM API answered ${response.status} for ${url.pathname}${url.search}`)
  }
  return response.json()
}

async function all<T>(path: string, query: Query = {}): Promise<T[]> {
  const page = await get<Paginated<T>>(path, { ...query, page_size: 1000 })
  return page.results
}

export function getSummary(filters: Query) {
  return get<DealMetrics>("analytics/summary/", filters)
}

export function getTimeline(
  filters: Query,
  interval: Interval = "month",
  dateField: "close_date" | "engage_date" = "close_date",
) {
  return get<TimelinePoint[]>("analytics/timeline/", { ...filters, interval, date_field: dateField })
}

export function getBreakdown(filters: Query, by: GroupBy, options: { ordering?: string; limit?: number } = {}) {
  return get<BreakdownRow[]>("analytics/breakdown/", { ...filters, by, ...options })
}

export function getFilterOptions() {
  return get<FilterOptions>("analytics/filter-options/")
}

export function getDeals(query: Query) {
  return get<Paginated<Opportunity>>("sales-pipeline/", query)
}

export const getAccounts = () => all<Account>("accounts/")
export const getProducts = () => all<Product>("products/")
export const getSalesAgents = () => all<SalesAgent>("sales-teams/")
