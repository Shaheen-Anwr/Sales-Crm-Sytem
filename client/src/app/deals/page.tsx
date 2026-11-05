import type { Metadata } from "next"
import { Suspense } from "react"

import { PageHeader, TableSkeleton } from "@/components/page-states"
import { getDeals, getProducts, getSalesAgents } from "@/lib/api"
import { first } from "@/lib/filters"
import { formatDate, formatMoney } from "@/lib/format"
import { DEAL_STAGES, type DealStage } from "@/lib/types"

import { DealsView } from "./deals-view"

export const metadata: Metadata = { title: "Deals" }

const PAGE_SIZE = 25

export default function DealsPage({ searchParams }: PageProps<"/deals">) {
  return (
    <>
      <PageHeader
        title="Deals"
        description="Every opportunity in the pipeline. Search it, narrow it by stage, agent or product, and sort any column."
      />
      <Suspense fallback={<TableSkeleton rows={12} />}>
        <Deals searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Deals({ searchParams }: Pick<PageProps<"/deals">, "searchParams">) {
  const params = await searchParams
  const stage = DEAL_STAGES.find((s) => s === first(params.deal_stage)) ?? null
  const query = {
    search: first(params.search),
    sales_agent: first(params.sales_agent),
    product: first(params.product),
  }

  // The count of every stage tab, then the requested page, clamped to the pages there are.
  const [counts, agents, products] = await Promise.all([
    Promise.all([undefined, ...DEAL_STAGES].map((s) => getDeals({ ...query, deal_stage: s, page_size: 1 }).then((r) => r.count))),
    getSalesAgents(),
    getProducts(),
  ])
  const total = counts[stage ? DEAL_STAGES.indexOf(stage) + 1 : 0]
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(pages, Math.max(1, Math.floor(Number(first(params.page))) || 1))
  const deals = await getDeals({ ...query, deal_stage: stage ?? undefined, ordering: first(params.ordering), page, page_size: PAGE_SIZE })

  return (
    <DealsView
      rows={deals.results.map((deal) => ({
        id: deal.id,
        opportunityId: deal.opportunity_id,
        account: deal.account,
        agent: deal.sales_agent,
        product: deal.product,
        stage: deal.deal_stage,
        engaged: formatDate(deal.engage_date),
        closed: formatDate(deal.close_date),
        value: formatMoney(deal.close_value),
      }))}
      counts={Object.fromEntries([["all", counts[0]], ...DEAL_STAGES.map((s, i) => [s, counts[i + 1]])]) as Record<DealStage | "all", number>}
      agents={unique(agents.map((agent) => agent.sales_agent))}
      products={unique(products.map((product) => product.product))}
      page={page}
      pages={pages}
      total={total}
      pageSize={PAGE_SIZE}
    />
  )
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}
