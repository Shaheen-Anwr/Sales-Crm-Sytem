import type { Metadata } from "next"
import { Suspense } from "react"

import { ChartCard, ChartNote } from "@/components/chart-card"
import { BarList } from "@/components/charts/bar-list"
import { Funnel } from "@/components/charts/funnel"
import { Sparkline, type SparkPoint } from "@/components/charts/sparkline"
import { TrendChart } from "@/components/charts/trend-chart"
import { WonLostChart } from "@/components/charts/won-lost-chart"
import { DashboardFilters } from "@/components/filters/dashboard-filters"
import { Delta, KpiTile, PartialComparison } from "@/components/kpi-tile"
import { DashboardSkeleton, EmptyState, FilterBarSkeleton, PageHeader } from "@/components/page-states"
import { getBreakdown, getSummary, getTimeline } from "@/lib/api"
import { dealFilters, first, parseInterval, periodOf } from "@/lib/filters"
import { capitalize, formatCount, formatDays, formatMoney, formatMonth, formatPercent } from "@/lib/format"
import { breakdownTable, intervalTitle, labelPoints, revenueItems, winRateItems } from "@/lib/chart-data"
import { dataRange, describePeriod, monthInPeriod, overlap, periodLabel, previousPeriod } from "@/lib/periods"
import type { DealMetrics } from "@/lib/types"

export const metadata: Metadata = { title: "Overview" }

export default function OverviewPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Revenue, win rate and pipeline across every deal. The filters apply to the whole page."
      />
      <Suspense fallback={<FilterBarSkeleton />}>
        <DashboardFilters interval />
      </Suspense>
      <Suspense fallback={<DashboardSkeleton />}>
        <Overview searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Overview({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams
  const filters = dealFilters(params)
  const dimensions = dealFilters(params, { period: false })
  const period = periodOf(params)
  const previous = period ? previousPeriod(period) : null
  const interval = parseInterval(first(params.interval))

  const [summary, before, openDeals, months, timeline, offices, agents, products, sectors, allMonths] = await Promise.all([
    getSummary(filters),
    previous ? getSummary({ ...dimensions, close_date__gte: previous.from, close_date__lte: previous.to }) : null,
    // Open deals have no close date yet, so the pipeline ignores the period.
    period ? getSummary(dimensions) : null,
    getTimeline(dimensions, "month"),
    getTimeline(filters, interval),
    getBreakdown(filters, "regional_office"),
    getBreakdown(filters, "sales_agent", { limit: 8 }),
    getBreakdown(filters, "product"),
    getBreakdown(filters, "sector"),
    getTimeline({}, "month"),
  ])

  if (summary.deals === 0) {
    return <EmptyState title="No deals match these filters" description="Try a longer period, or remove a filter." />
  }

  const pipeline = openDeals ?? summary
  const sectorRows = sectors.map((row) => ({ ...row, group: row.group && capitalize(row.group) }))
  const closed = summary.won + summary.lost
  const data = dataRange(allMonths)
  const trend = labelPoints(timeline, interval, overlap(period, data))
  const partialNote = trend.some((point) => point.partial)
    ? `partial ${interval}s, where the period or the data starts or ends inside them.`
    : null

  // Sparklines show every month, with the selected period drawn in the accent.
  const spark = (pick: (point: DealMetrics) => number | null): SparkPoint[] =>
    months.map((point) => ({
      label: periodLabel(point.period, "month"),
      value: pick(point),
      current: !period || monthInPeriod(point.period, period),
    }))

  // Each tile compares with the period just before the selected one. When the data starts
  // inside that period, its totals cover only part of it, so only rates and averages compare.
  const partialBefore = previous !== null && data !== null && previous.from < data.from
  const delta = (
    pick: (metrics: DealMetrics) => number | null,
    options: { kind?: "points"; upIsGood?: boolean; total?: boolean } = {},
  ) => {
    if (!previous || !before) return null
    const { total, ...rest } = options
    if (total && partialBefore && data) {
      return <PartialComparison comparedTo={describePeriod(previous)} dataStart={formatMonth(data.from)} />
    }
    return <Delta current={pick(summary)} previous={pick(before)} comparedTo={describePeriod(previous)} {...rest} />
  }

  const span = months.length ? `${formatMonth(months[0].period)} – ${formatMonth(months.at(-1)!.period)}` : undefined

  return (
    <div className="space-y-4 transition-opacity group-has-data-pending:opacity-50">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <KpiTile
          hero
          label="Revenue"
          value={formatMoney(summary.revenue)}
          delta={delta((m) => m.revenue, { total: true })}
          caption={period ? undefined : `All time · ${span}`}
          trend={<Sparkline data={spark((m) => m.revenue)} name="revenue" format="compactMoney" />}
        />
        <KpiTile
          label="Deals won"
          value={formatCount(summary.won)}
          delta={delta((m) => m.won, { total: true })}
          caption={`of ${formatCount(closed)} closed`}
          trend={<Sparkline data={spark((m) => m.won)} name="deals won" format="count" />}
        />
        <KpiTile
          label="Win rate"
          value={formatPercent(summary.win_rate)}
          delta={delta((m) => m.win_rate, { kind: "points" })}
          caption={period ? undefined : "of closed deals"}
          trend={<Sparkline data={spark((m) => m.win_rate)} name="win rate" format="percent" />}
        />
        <KpiTile
          label="Avg deal size"
          value={formatMoney(summary.avg_deal_size)}
          delta={delta((m) => m.avg_deal_size)}
          caption={period ? undefined : "per won deal"}
          trend={<Sparkline data={spark((m) => m.avg_deal_size)} name="avg deal size" format="money" />}
        />
        <KpiTile
          label="Sales cycle"
          value={formatDays(summary.avg_days_to_close)}
          delta={delta((m) => m.avg_days_to_close, { upIsGood: false })}
          caption={period ? undefined : "engaged to won"}
          trend={<Sparkline data={spark((m) => m.avg_days_to_close)} name="avg days to close" format="days" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-7 xl:col-span-8"
          title="Revenue"
          description={`Close value of the deals won, per ${interval}`}
          table={{
            columns: [{ label: intervalTitle(interval) }, { label: "Revenue", numeric: true }, { label: "Deals won", numeric: true }],
            rows: trend.map((point) => [point.title, formatMoney(point.revenue), formatCount(point.won)]),
          }}
        >
          <TrendChart data={trend} dataKey="revenue" name="revenue" format="compactMoney" height={320} />
          {partialNote && <ChartNote>Hollow points are {partialNote}</ChartNote>}
        </ChartCard>

        <ChartCard
          className="lg:col-span-5 xl:col-span-4"
          title="Pipeline"
          description={period ? "Every deal to date: open deals have no close date, so the period doesn't apply." : "How far the deals have got"}
          table={{
            columns: [{ label: "Stage" }, { label: "Deals", numeric: true }, { label: "Share", numeric: true }],
            rows: funnelStages(pipeline).map((stage) => [
              stage.label,
              formatCount(stage.value),
              formatPercent(pipeline.deals ? stage.value / pipeline.deals : null),
            ]),
          }}
        >
          <Funnel stages={funnelStages(pipeline)} />
          <div className="mt-5 flex items-baseline justify-between gap-3 border-t pt-4">
            <div>
              <p className="text-sm">Open pipeline</p>
              <p className="text-xs text-muted-foreground">
                {formatCount(pipeline.prospecting + pipeline.engaging)} open deals at list price
              </p>
            </div>
            <p className="text-lg font-semibold">{formatMoney(pipeline.pipeline_value)}</p>
          </div>
        </ChartCard>

        <ChartCard
          className="lg:col-span-7 xl:col-span-8"
          title="Won vs lost"
          description={`Deals closed per ${interval}`}
          table={{
            columns: [
              { label: intervalTitle(interval) },
              { label: "Won", numeric: true },
              { label: "Lost", numeric: true },
              { label: "Win rate", numeric: true },
            ],
            rows: trend.map((point) => [point.title, formatCount(point.won), formatCount(point.lost), formatPercent(point.win_rate)]),
          }}
        >
          <WonLostChart data={trend} />
          {partialNote && <ChartNote>Faded bars are {partialNote}</ChartNote>}
        </ChartCard>

        <ChartCard
          className="lg:col-span-5 xl:col-span-4"
          title="Top agents"
          description="The 8 agents with the most revenue"
          table={breakdownTable("Agent", agents)}
        >
          <BarList items={revenueItems(agents)} valueLabel="revenue" ranked />
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Offices" description="Revenue and win rate by office" table={breakdownTable("Office", offices)}>
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Revenue</h3>
          <BarList items={revenueItems(offices)} valueLabel="revenue" />
          <h3 className="mt-4 mb-1 text-xs font-medium text-muted-foreground">Win rate</h3>
          <BarList items={winRateItems(offices)} valueLabel="win rate" max={1} />
        </ChartCard>
        <ChartCard title="Revenue by product" description="Every product with deals" table={breakdownTable("Product", products)}>
          <BarList items={revenueItems(products)} valueLabel="revenue" />
        </ChartCard>
        <ChartCard
          className="md:col-span-2 xl:col-span-1"
          title="Revenue by sector"
          description="The industries of the accounts"
          table={breakdownTable("Sector", sectorRows)}
        >
          <BarList items={revenueItems(sectorRows)} valueLabel="revenue" />
        </ChartCard>
      </div>
    </div>
  )
}

function funnelStages(metrics: DealMetrics) {
  return [
    { key: "all", label: "All deals", value: metrics.deals, description: "every opportunity" },
    { key: "engaged", label: "Engaged", value: metrics.engaging + metrics.won + metrics.lost, description: "past prospecting" },
    { key: "closed", label: "Closed", value: metrics.won + metrics.lost, description: "won or lost" },
    { key: "won", label: "Won", value: metrics.won, description: "closed as won" },
  ]
}
