import type { Metadata } from "next"
import { Suspense } from "react"

import { ChartCard, ChartNote } from "@/components/chart-card"
import { BarList } from "@/components/charts/bar-list"
import { MultiLineChart } from "@/components/charts/multi-line-chart"
import { DataTable } from "@/components/data-table"
import { DashboardFilters } from "@/components/filters/dashboard-filters"
import { KpiTile } from "@/components/kpi-tile"
import { CardSkeleton, EmptyState, FilterBarSkeleton, KpiRowSkeleton, PageHeader } from "@/components/page-states"
import { InlineBar, Person } from "@/components/table-cells"
import { getBreakdown, getSalesAgents, getTimeline } from "@/lib/api"
import { breakdownTable, named, revenueByEntity } from "@/lib/chart-data"
import { dealFilters, first, parseInterval, periodOf } from "@/lib/filters"
import { dataRange, overlap } from "@/lib/periods"
import { formatCount, formatDays, formatMoney, formatPercent, plural } from "@/lib/format"
import type { BreakdownRow } from "@/lib/types"

export const metadata: Metadata = { title: "Team" }

export default function TeamPage({ searchParams }: PageProps<"/team">) {
  return (
    <>
      <PageHeader title="Team" description="How each office, manager and sales agent is doing on the deals the filters select." />
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
        <Team searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Team({ searchParams }: Pick<PageProps<"/team">, "searchParams">) {
  const params = await searchParams
  const filters = dealFilters(params)
  const interval = parseInterval(first(params.interval))

  // A timeline per office the filters leave, fetched as soon as those are known.
  const officeRows = getBreakdown(filters, "regional_office").then(named)
  const [offices, timelines, managers, agentRows, team, allMonths] = await Promise.all([
    officeRows,
    officeRows.then((rows) => Promise.all(rows.map((row) => getTimeline({ ...filters, regional_office: row.group }, interval)))),
    getBreakdown(filters, "manager"),
    getBreakdown(filters, "sales_agent", { limit: 1000 }),
    getSalesAgents(),
    getTimeline({}, "month"),
  ])

  if (offices.length === 0) {
    return <EmptyState title="No deals match these filters" description="Try a longer period, or remove a filter." />
  }

  const allOffices = team.map((agent) => agent.regional_office)
  const range = overlap(periodOf(params), dataRange(allMonths))
  const chart = revenueByEntity(allOffices, offices.map((row) => row.group), timelines, interval, range)
  const officeOf = new Map(team.map((agent) => [agent.manager, agent.regional_office]))
  const agentsPerOffice = (office: string) => team.filter((agent) => agent.regional_office === office).length

  // Every agent the office / manager / agent filters allow, with or without deals.
  const metrics = new Map(named(agentRows).map((row) => [row.group, row]))
  const agents = team.filter(
    (agent) =>
      (!filters.regional_office || agent.regional_office === filters.regional_office) &&
      (!filters.manager || agent.manager === filters.manager) &&
      (!filters.sales_agent || agent.sales_agent === filters.sales_agent),
  )
  const topRevenue = Math.max(0, ...agents.map((agent) => metrics.get(agent.sales_agent)?.revenue ?? 0))

  return (
    <div className="space-y-4 transition-opacity group-has-data-pending:opacity-50">
      <div className="grid gap-4 md:grid-cols-3">
        {[...offices]
          .sort((a, b) => a.group.localeCompare(b.group))
          .map((office) => (
            <KpiTile
              key={office.group}
              label={office.group}
              marker={chart.colors.get(office.group)}
              value={formatMoney(office.revenue)}
              caption={`${formatPercent(office.win_rate)} win rate · ${formatCount(office.won)} won · ${plural(agentsPerOffice(office.group), "agent")}`}
            />
          ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-7 xl:col-span-8"
          title="Revenue by office"
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
          title="Revenue by manager"
          description="The deals won by each manager's team"
          table={breakdownTable("Manager", managers)}
        >
          <BarList
            valueLabel="revenue"
            items={named(managers).map((row) => ({
              key: row.group,
              label: row.group,
              value: row.revenue,
              display: formatMoney(row.revenue, { compact: true }),
              details: [
                { key: "office", label: "office", value: officeOf.get(row.group) ?? "—" },
                { key: "won", label: "deals won", value: formatCount(row.won) },
                { key: "rate", label: "win rate", value: formatPercent(row.win_rate) },
              ],
            }))}
          />
        </ChartCard>
      </div>

      <ChartCard title="Agents" description="Every sales agent, by revenue. Click a column to sort it.">
        <DataTable
          searchPlaceholder="Search agents, managers or offices"
          defaultSort={{ key: "revenue", desc: true }}
          emptyMessage="No agent matches the search."
          columns={[
            { key: "agent", label: "Agent", sortable: true },
            { key: "won", label: "Won", numeric: true, sortable: true, className: "hidden sm:table-cell" },
            { key: "win_rate", label: "Win rate", numeric: true, sortable: true },
            { key: "revenue", label: "Revenue", numeric: true, sortable: true },
            { key: "avg_deal_size", label: "Avg deal", numeric: true, sortable: true, className: "hidden md:table-cell" },
            { key: "cycle", label: "Sales cycle", numeric: true, sortable: true, className: "hidden md:table-cell" },
            { key: "pipeline", label: "Open pipeline", numeric: true, sortable: true, className: "hidden lg:table-cell" },
          ]}
          rows={agents.map((agent) => {
            const row: Partial<BreakdownRow> = metrics.get(agent.sales_agent) ?? {}
            return {
              id: agent.id,
              search: `${agent.sales_agent} ${agent.manager} ${agent.regional_office}`,
              cells: {
                agent: <Person name={agent.sales_agent} detail={`${agent.manager} · ${agent.regional_office}`} />,
                won: formatCount(row.won ?? 0),
                win_rate: formatPercent(row.win_rate),
                revenue: <InlineBar value={row.revenue ?? 0} max={topRevenue} display={formatMoney(row.revenue ?? 0)} />,
                avg_deal_size: formatMoney(row.avg_deal_size),
                cycle: formatDays(row.avg_days_to_close),
                pipeline: formatMoney(row.pipeline_value ?? 0),
              },
              sort: {
                agent: agent.sales_agent,
                won: row.won ?? 0,
                win_rate: row.win_rate ?? null,
                revenue: row.revenue ?? 0,
                avg_deal_size: row.avg_deal_size ?? null,
                cycle: row.avg_days_to_close ?? null,
                pipeline: row.pipeline_value ?? 0,
              },
            }
          })}
        />
      </ChartCard>
    </div>
  )
}
