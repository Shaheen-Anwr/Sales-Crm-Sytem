import type { Metadata } from "next"
import { Suspense } from "react"

import { ChartCard, ChartNote } from "@/components/chart-card"
import { BarList } from "@/components/charts/bar-list"
import { MultiLineChart } from "@/components/charts/multi-line-chart"
import { DataTable } from "@/components/data-table"
import { DashboardFilters } from "@/components/filters/dashboard-filters"
import { KpiTile } from "@/components/kpi-tile"
import { CardSkeleton, EmptyState, FilterBarSkeleton, KpiRowSkeleton, PageHeader } from "@/components/page-states"
import { InlineBar } from "@/components/table-cells"
import { getBreakdown, getProducts, getTimeline } from "@/lib/api"
import { named, revenueByEntity, winRateItems } from "@/lib/chart-data"
import { dealFilters, first, parseInterval, periodOf } from "@/lib/filters"
import { dataRange, overlap } from "@/lib/periods"
import { formatCount, formatMoney, formatPercent, plural } from "@/lib/format"

export const metadata: Metadata = { title: "Products" }

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <PageHeader title="Products" description="Revenue and win rates for each product and product series." />
      <Suspense fallback={<FilterBarSkeleton />}>
        <DashboardFilters interval />
      </Suspense>
      <Suspense
        fallback={
          <div className="space-y-4">
            <KpiRowSkeleton tiles={3} />
            <CardSkeleton height={300} />
          </div>
        }
      >
        <Products searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Products({ searchParams }: Pick<PageProps<"/products">, "searchParams">) {
  const params = await searchParams
  const filters = dealFilters(params)
  const interval = parseInterval(first(params.interval))

  // A timeline per product series the filters leave, fetched as soon as those are known.
  const seriesRows = getBreakdown(filters, "series").then(named)
  const [series, timelines, productRows, catalog, allMonths] = await Promise.all([
    seriesRows,
    seriesRows.then((rows) => Promise.all(rows.map((row) => getTimeline({ ...filters, series: row.group }, interval)))),
    getBreakdown(filters, "product"),
    getProducts(),
    getTimeline({}, "month"),
  ])

  if (series.length === 0) {
    return <EmptyState title="No deals match these filters" description="Try a longer period, or remove a filter." />
  }

  const range = overlap(periodOf(params), dataRange(allMonths))
  const chart = revenueByEntity(catalog.map((product) => product.series), series.map((row) => row.group), timelines, interval, range)
  const metrics = new Map(named(productRows).map((row) => [row.group, row]))
  const products = catalog.filter((product) => metrics.has(product.product))
  const topRevenue = Math.max(0, ...products.map((product) => metrics.get(product.product)!.revenue))
  const productsIn = (name: string) => catalog.filter((product) => product.series === name).length

  return (
    <div className="space-y-4 transition-opacity group-has-data-pending:opacity-50">
      <div className="grid gap-4 md:grid-cols-3">
        {[...series]
          .sort((a, b) => a.group.localeCompare(b.group))
          .map((row) => (
            <KpiTile
              key={row.group}
              label={`${row.group} series`}
              marker={chart.colors.get(row.group)}
              value={formatMoney(row.revenue)}
              caption={`${formatPercent(row.win_rate)} win rate · ${formatCount(row.won)} won · ${plural(productsIn(row.group), "product")}`}
            />
          ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-7 xl:col-span-8"
          title="Revenue by series"
          description={`Close value of the deals won, per ${interval}`}
          table={chart.table}
        >
          <MultiLineChart data={chart.data} series={chart.series} format="compactMoney" height={280} />
          {chart.data.some((point) => point.partial) && (
            <ChartNote>Hollow points are partial {interval}s, where the period or the data starts or ends inside them.</ChartNote>
          )}
        </ChartCard>
        <ChartCard
          className="lg:col-span-5 xl:col-span-4"
          title="Win rate by product"
          description="Share of the closed deals that were won"
          table={{
            columns: [{ label: "Product" }, { label: "Win rate", numeric: true }, { label: "Won", numeric: true }, { label: "Lost", numeric: true }],
            rows: products.map((product) => {
              const row = metrics.get(product.product)!
              return [product.product, formatPercent(row.win_rate), formatCount(row.won), formatCount(row.lost)]
            }),
          }}
        >
          <BarList
            valueLabel="win rate"
            max={1}
            items={winRateItems([...named(productRows)].sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0)))}
          />
        </ChartCard>
      </div>

      <ChartCard title="All products" description="List prices against what the deals actually closed at. Click a column to sort it.">
        <DataTable
          defaultSort={{ key: "revenue", desc: true }}
          columns={[
            { key: "product", label: "Product", sortable: true },
            { key: "price", label: "List price", numeric: true, sortable: true, className: "hidden sm:table-cell" },
            { key: "won", label: "Won", numeric: true, sortable: true },
            { key: "win_rate", label: "Win rate", numeric: true, sortable: true, className: "hidden md:table-cell" },
            { key: "revenue", label: "Revenue", numeric: true, sortable: true },
            { key: "avg_deal_size", label: "Avg deal", numeric: true, sortable: true, className: "hidden md:table-cell" },
            { key: "pipeline", label: "Open pipeline", numeric: true, sortable: true, className: "hidden lg:table-cell" },
          ]}
          rows={products.map((product) => {
            const row = metrics.get(product.product)!
            const versusList = row.avg_deal_size === null ? null : row.avg_deal_size / product.sales_price - 1
            return {
              id: product.id,
              cells: {
                product: (
                  <span>
                    <span className="block font-medium">{product.product}</span>
                    <span className="block text-xs text-muted-foreground">{product.series} series</span>
                  </span>
                ),
                price: formatMoney(product.sales_price),
                won: formatCount(row.won),
                win_rate: formatPercent(row.win_rate),
                revenue: <InlineBar value={row.revenue} max={topRevenue} display={formatMoney(row.revenue)} />,
                avg_deal_size: (
                  <span>
                    <span className="block">{formatMoney(row.avg_deal_size)}</span>
                    {versusList !== null && (
                      <span className="block text-xs text-muted-foreground">
                        {Math.abs(versusList) < 0.0005
                          ? "at list price"
                          : `${formatPercent(Math.abs(versusList))} ${versusList < 0 ? "below" : "above"} list`}
                      </span>
                    )}
                  </span>
                ),
                pipeline: formatMoney(row.pipeline_value),
              },
              sort: {
                product: product.product,
                price: product.sales_price,
                won: row.won,
                win_rate: row.win_rate,
                revenue: row.revenue,
                avg_deal_size: row.avg_deal_size,
                pipeline: row.pipeline_value,
              },
            }
          })}
        />
      </ChartCard>
    </div>
  )
}
