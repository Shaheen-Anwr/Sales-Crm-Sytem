import { FilterBar } from "@/components/filters/filter-bar"
import { getFilterOptions, getProducts, getSalesAgents, getTimeline } from "@/lib/api"
import { endOfMonth, periodPresets } from "@/lib/periods"

/** The filter bar of the analytics pages, with its options loaded from the API. */
export async function DashboardFilters({ interval = false }: { interval?: boolean }) {
  const [options, agents, products, months] = await Promise.all([
    getFilterOptions(),
    getSalesAgents(),
    getProducts(),
    getTimeline({}, "month"),
  ])
  // Offer the quarters and years that actually contain closed deals.
  const firstMonth = months[0]?.period
  const lastMonth = months.at(-1)?.period
  return (
    <FilterBar
      agents={agents}
      products={products}
      sectors={options.sector}
      presets={firstMonth && lastMonth ? periodPresets(firstMonth, lastMonth) : []}
      bounds={{ from: firstMonth ?? "", to: lastMonth ? endOfMonth(lastMonth) : "" }}
      interval={interval}
    />
  )
}
