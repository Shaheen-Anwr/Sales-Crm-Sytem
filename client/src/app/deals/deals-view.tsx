"use client"

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw, Search, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { FilterSelect } from "@/components/filters/filter-bar"
import { useUrlParams, type ParamChanges } from "@/components/filters/use-url-params"
import { StageBadge } from "@/components/table-cells"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCount } from "@/lib/format"
import { DEAL_STAGES, type DealStage } from "@/lib/types"
import { cn } from "@/lib/utils"

export type DealRow = {
  id: string
  opportunityId: string
  account: string | null
  agent: string
  product: string
  stage: DealStage
  engaged: string
  closed: string
  value: string
}

type Column = {
  /** The API's ordering field. */
  field: string
  label: string
  /** Dates and values sort newest / largest first. */
  descending?: boolean
  numeric?: boolean
  className?: string
}

const COLUMNS: Column[] = [
  { field: "opportunity_id", label: "Deal", className: "pl-4" },
  { field: "account", label: "Account" },
  { field: "sales_agent", label: "Agent", className: "hidden lg:table-cell" },
  { field: "product", label: "Product", className: "hidden md:table-cell" },
  { field: "deal_stage", label: "Stage" },
  { field: "engage_date", label: "Engaged", descending: true, className: "hidden xl:table-cell" },
  { field: "close_date", label: "Closed", descending: true, className: "hidden xl:table-cell" },
  { field: "close_value", label: "Value", descending: true, numeric: true, className: "pr-4" },
]

/** On a phone the column headers are hidden, so a menu offers the useful orders. */
const PHONE_ORDERINGS = [
  { value: "-engage_date", label: "Newest engaged" },
  { value: "-close_date", label: "Newest closed" },
  { value: "-close_value", label: "Highest value" },
  { value: "account", label: "Account A–Z" },
]

const DEFAULT_ORDERING = "-engage_date"
const SEARCH_DELAY = 300

type Props = {
  rows: DealRow[]
  counts: Record<DealStage | "all", number>
  agents: string[]
  products: string[]
  page: number
  pages: number
  total: number
  pageSize: number
}

export function DealsView({ rows, counts, agents, products, page, pages, total, pageSize }: Props) {
  const { params, update, isPending } = useUrlParams()
  const stage = params.get("deal_stage") ?? "all"
  const ordering = params.get("ordering") ?? DEFAULT_ORDERING
  const tableTop = useRef<HTMLDivElement>(null)

  // The search box updates the URL once typing pauses. `synced` is the search the URL
  // had when the box last matched it, so a change from elsewhere (Reset, the back
  // button) refills the box, while the user's own typing is never overwritten.
  const urlSearch = params.get("search") ?? ""
  const [text, setText] = useState(urlSearch)
  const [synced, setSynced] = useState(urlSearch)
  if (urlSearch !== synced) {
    setSynced(urlSearch)
    setText(urlSearch)
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latestUpdate = useRef(update)
  useEffect(() => {
    latestUpdate.current = update
  })
  useEffect(() => () => clearTimeout(timer.current), [])

  function search(value: string, delay = SEARCH_DELAY) {
    setText(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setSynced(value.trim())
      latestUpdate.current({ search: value.trim() || null }, { replace: true })
    }, delay)
  }

  function change(changes: ParamChanges, options?: { keepPage?: boolean }) {
    update(changes, options)
    // After paging from the bottom of the table, bring its top back into view.
    const top = tableTop.current?.getBoundingClientRect().top ?? 0
    if (top < 0) tableTop.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function sortBy(column: Column) {
    const next =
      ordering === column.field
        ? `-${column.field}`
        : ordering === `-${column.field}`
          ? column.field
          : column.descending
            ? `-${column.field}`
            : column.field
    update({ ordering: next === DEFAULT_ORDERING ? null : next })
  }

  const filtered = Boolean(urlSearch || params.get("sales_agent") || params.get("product") || params.get("deal_stage"))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <Tabs value={stage} onValueChange={(value) => update({ deal_stage: value === "all" ? null : value })} data-pending={isPending || undefined}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList variant="line" aria-label="Deal stage">
          {(["all", ...DEAL_STAGES] as const).map((value) => (
            <TabsTrigger key={value} value={value} className="px-2.5">
              {value === "all" ? "All deals" : value}
              <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground tabular-nums">
                {formatCount(counts[value])}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="mt-2 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-96">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={text}
            onChange={(event) => search(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && search(text, 0)}
            placeholder="Search by ID, account, agent or product"
            aria-label="Search deals"
            className="h-7 pr-8 pl-8 text-[0.8rem] [&::-webkit-search-cancel-button]:hidden"
          />
          {text && (
            <button
              type="button"
              onClick={() => search("", 0)}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <FilterSelect label="Agent" value={params.get("sales_agent")} options={agents} onChange={(v) => update({ sales_agent: v })} />
        <FilterSelect label="Product" value={params.get("product")} options={products} onChange={(v) => update({ product: v })} />
        <Select
          value={PHONE_ORDERINGS.some((o) => o.value === ordering) ? ordering : undefined}
          onValueChange={(next) => update({ ordering: next === DEFAULT_ORDERING ? null : next })}
        >
          <SelectTrigger size="sm" aria-label="Sort by" className="gap-1 sm:hidden">
            <span className="text-muted-foreground">Sort</span>
            <SelectValue placeholder="Custom" />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {PHONE_ORDERINGS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearTimeout(timer.current)
              update({ search: null, sales_agent: null, product: null, deal_stage: null })
            }}
          >
            <RotateCcw /> Reset
          </Button>
        )}
        <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isPending && (
            <>
              <LoaderCircle className="size-3.5 animate-spin" /> Updating
            </>
          )}
        </span>
      </div>

      <TabsContent value={stage}>
        <div ref={tableTop} className="scroll-mt-20" />
        <Card className="gap-0 py-0 transition-opacity group-has-data-pending:opacity-50">
          <CardContent className="px-0">
            <ul className="divide-y sm:hidden">
              {rows.map((deal) => (
                <li key={deal.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={cn("truncate font-medium", !deal.account && "font-normal text-muted-foreground")}>
                      {deal.account ?? "No account yet"}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{deal.value}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {deal.product} · {deal.agent}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <StageBadge stage={deal.stage} />
                    <span className="font-mono">{deal.opportunityId}</span>
                  </div>
                </li>
              ))}
              {rows.length === 0 && <li className="px-4 py-16 text-center text-muted-foreground">No deals match. Try another search, stage or filter.</li>}
            </ul>
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {COLUMNS.map((column) => {
                    const active = ordering === column.field || ordering === `-${column.field}`
                    const descending = ordering.startsWith("-")
                    const Icon = !active ? ArrowUpDown : descending ? ArrowDown : ArrowUp
                    const numeric = column.numeric
                    return (
                      <TableHead
                        key={column.field}
                        aria-sort={active ? (descending ? "descending" : "ascending") : undefined}
                        className={cn(numeric && "text-right", column.className)}
                      >
                        <button
                          type="button"
                          onClick={() => sortBy(column)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                            numeric && "flex-row-reverse",
                            active ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {column.label}
                          <Icon className={cn("size-3.5", !active && "opacity-50")} />
                        </button>
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="pl-4 font-mono text-xs">{deal.opportunityId}</TableCell>
                    <TableCell className="max-w-40 truncate font-medium xl:max-w-48">
                      {deal.account ?? <span className="font-normal text-muted-foreground">No account yet</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{deal.agent}</TableCell>
                    <TableCell className="hidden md:table-cell">{deal.product}</TableCell>
                    <TableCell>
                      <StageBadge stage={deal.stage} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground tabular-nums xl:table-cell">{deal.engaged}</TableCell>
                    <TableCell className="hidden text-muted-foreground tabular-nums xl:table-cell">{deal.closed}</TableCell>
                    <TableCell className="pr-4 text-right font-medium tabular-nums">{deal.value}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLUMNS.length} className="py-16 text-center text-muted-foreground">
                      No deals match. Try another search, stage or filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3 py-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              {total === 0 ? "No deals" : `Showing ${formatCount(from)}–${formatCount(to)} of ${formatCount(total)} deals`}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {formatCount(page)} of {formatCount(pages)}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => change({ page: page - 1 > 1 ? String(page - 1) : null }, { keepPage: true })}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={page >= pages}
                onClick={() => change({ page: String(page + 1) }, { keepPage: true })}
              >
                <ChevronRight />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
