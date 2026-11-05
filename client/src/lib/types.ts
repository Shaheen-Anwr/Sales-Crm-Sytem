// The JSON the Django API returns. The API documents every field at
// http://127.0.0.1:8000/api/docs/ (the "Schemas" section at the bottom).

export type DealStage = "Prospecting" | "Engaging" | "Won" | "Lost"

/** The stages in pipeline order. */
export const DEAL_STAGES: DealStage[] = ["Prospecting", "Engaging", "Won", "Lost"]

/** The metrics /api/analytics/ returns for a group of deals. */
export type DealMetrics = {
  deals: number
  prospecting: number
  engaging: number
  won: number
  lost: number
  revenue: number
  pipeline_value: number
  win_rate: number | null
  avg_deal_size: number | null
  avg_days_to_close: number | null
}

export type TimelinePoint = DealMetrics & { period: string; label: string }

export type BreakdownRow = DealMetrics & { group: string | null }

export type GroupBy =
  | "deal_stage"
  | "sales_agent"
  | "product"
  | "account"
  | "manager"
  | "regional_office"
  | "series"
  | "sector"
  | "office_location"

export type Interval = "week" | "month" | "quarter"

export type FilterOptions = Record<Exclude<GroupBy, "deal_stage">, string[]> & {
  deal_stage: DealStage[]
}

export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Opportunity = {
  id: string
  opportunity_id: string
  sales_agent: string
  product: string
  account: string | null
  deal_stage: DealStage
  engage_date: string | null
  close_date: string | null
  close_value: number | null
}

export type Account = {
  id: string
  account: string
  sector: string
  year_established: number
  revenue: number
  employees: number
  office_location: string
  subsidiary_of: string | null
}

export type Product = {
  id: string
  product: string
  series: string
  sales_price: number
}

export type SalesAgent = {
  id: string
  sales_agent: string
  manager: string
  regional_office: string
}
