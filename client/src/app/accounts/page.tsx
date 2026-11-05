import type { Metadata } from "next"
import { Suspense } from "react"

import { ChartCard } from "@/components/chart-card"
import { BarList } from "@/components/charts/bar-list"
import { DataTable } from "@/components/data-table"
import { DashboardFilters } from "@/components/filters/dashboard-filters"
import { CardSkeleton, EmptyState, FilterBarSkeleton, PageHeader, TableSkeleton } from "@/components/page-states"
import { InlineBar } from "@/components/table-cells"
import { getAccounts, getBreakdown } from "@/lib/api"
import { breakdownTable, foldTail, named, revenueItems } from "@/lib/chart-data"
import { dealFilters } from "@/lib/filters"
import { capitalize, formatCount, formatMoney, formatPercent, plural } from "@/lib/format"

export const metadata: Metadata = { title: "Accounts" }

const TOP = 10
const COUNTRY_BARS = 10

export default function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  return (
    <>
      <PageHeader title="Accounts" description="The customers behind the deals: who buys the most, and where they are." />
      <Suspense fallback={<FilterBarSkeleton />}>
        <DashboardFilters />
      </Suspense>
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <CardSkeleton height={320} />
              <CardSkeleton height={320} />
            </div>
            <TableSkeleton />
          </div>
        }
      >
        <Accounts searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Accounts({ searchParams }: Pick<PageProps<"/accounts">, "searchParams">) {
  const filters = dealFilters(await searchParams)
  const [accountRows, countries, accounts] = await Promise.all([
    getBreakdown(filters, "account", { limit: 1000 }),
    getBreakdown(filters, "office_location"),
    getAccounts(),
  ])

  const withAccount = named(accountRows)
  if (withAccount.length === 0) {
    return <EmptyState title="No deals match these filters" description="Try a longer period, or remove a filter." />
  }

  const revenue = withAccount.reduce((total, row) => total + row.revenue, 0)
  const top = withAccount.slice(0, TOP)
  const topShare = revenue > 0 ? top.reduce((total, row) => total + row.revenue, 0) / revenue : null
  const unassigned = accountRows.find((row) => row.group === null)
  const countryRows = named(countries)
  const leader = countryRows.length > 1 && revenue > 0 ? countryRows[0] : null
  const details = new Map(accounts.map((account) => [account.account, account]))
  const topRevenue = Math.max(0, ...withAccount.map((row) => row.revenue))

  return (
    <div className="space-y-4 transition-opacity group-has-data-pending:opacity-50">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={`Top ${TOP} accounts`}
          description={`Together they bring ${formatPercent(topShare)} of the revenue`}
          table={breakdownTable("Account", top)}
        >
          <BarList items={revenueItems(top)} valueLabel="revenue" ranked />
        </ChartCard>
        <ChartCard
          title="Revenue by country"
          description={
            leader
              ? `By the accounts' head office. ${leader.group} alone brings ${formatPercent(leader.revenue / revenue)}.`
              : "By the accounts' head office"
          }
          table={breakdownTable("Country", countryRows)}
        >
          <BarList items={revenueItems(foldTail(countryRows, COUNTRY_BARS, (n) => `${n} other countries`))} valueLabel="revenue" />
        </ChartCard>
      </div>

      <ChartCard
        title="All accounts"
        description={
          unassigned
            ? `${plural(unassigned.deals, "open deal")}, worth ${formatMoney(unassigned.pipeline_value)} at list price, ${unassigned.deals === 1 ? "has" : "have"} no account yet, so ${unassigned.deals === 1 ? "it isn't" : "they aren't"} listed here.`
            : "Every account with deals the filters select. Click a column to sort it."
        }
      >
        <DataTable
          searchPlaceholder="Search accounts, sectors or countries"
          defaultSort={{ key: "revenue", desc: true }}
          limit={25}
          noun="accounts"
          emptyMessage="No account matches the search."
          columns={[
            { key: "account", label: "Account", sortable: true },
            { key: "country", label: "Country", sortable: true, className: "hidden md:table-cell" },
            { key: "employees", label: "Employees", numeric: true, sortable: true, className: "hidden lg:table-cell" },
            { key: "size", label: "Annual revenue", numeric: true, sortable: true, className: "hidden lg:table-cell" },
            { key: "won", label: "Won", numeric: true, sortable: true },
            { key: "win_rate", label: "Win rate", numeric: true, sortable: true, className: "hidden sm:table-cell" },
            { key: "revenue", label: "Revenue", numeric: true, sortable: true },
            { key: "pipeline", label: "Open pipeline", numeric: true, sortable: true, className: "hidden xl:table-cell" },
          ]}
          rows={withAccount.map((row) => {
            const account = details.get(row.group)
            const about = [account && capitalize(account.sector), account?.subsidiary_of && `part of ${account.subsidiary_of}`].filter(Boolean)
            return {
              id: row.group,
              search: [row.group, account?.sector, account?.office_location, account?.subsidiary_of].join(" "),
              cells: {
                account: (
                  <span>
                    <span className="block font-medium">{row.group}</span>
                    <span className="block text-xs text-muted-foreground">{about.join(" · ")}</span>
                  </span>
                ),
                country: account?.office_location ?? "—",
                employees: formatCount(account?.employees),
                // The accounts' own revenue is in millions of US dollars.
                size: formatMoney(account ? account.revenue * 1e6 : null, { compact: true }),
                won: formatCount(row.won),
                win_rate: formatPercent(row.win_rate),
                revenue: <InlineBar value={row.revenue} max={topRevenue} display={formatMoney(row.revenue)} />,
                pipeline: formatMoney(row.pipeline_value),
              },
              sort: {
                account: row.group,
                country: account?.office_location ?? null,
                employees: account?.employees ?? null,
                size: account?.revenue ?? null,
                won: row.won,
                win_rate: row.win_rate,
                revenue: row.revenue,
                pipeline: row.pipeline_value,
              },
            }
          })}
        />
      </ChartCard>
    </div>
  )
}
