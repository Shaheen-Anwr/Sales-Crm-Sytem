"use client"

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type DataColumn = {
  key: string
  label: string
  numeric?: boolean
  sortable?: boolean
  className?: string
}

export type DataRow = {
  id: string
  /** What each cell shows; any element, rendered on the server. */
  cells: Record<string, ReactNode>
  /** What each sortable column sorts by. */
  sort?: Record<string, string | number | null>
  /** Text the search box matches against. */
  search?: string
}

type Sort = { key: string; desc: boolean }

type Props = {
  columns: DataColumn[]
  rows: DataRow[]
  defaultSort?: Sort
  /** Shows a search box with this placeholder. */
  searchPlaceholder?: string
  emptyMessage?: string
  /** Show this many rows at first, with a button to show the rest. */
  limit?: number
  /** What a row is, for that button: "accounts". */
  noun?: string
}

/** A table the reader can sort by clicking a header, and optionally search. */
export function DataTable({
  columns,
  rows,
  defaultSort,
  searchPlaceholder,
  emptyMessage = "Nothing to show.",
  limit,
  noun = "rows",
}: Props) {
  const [sort, setSort] = useState<Sort | undefined>(defaultSort)
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState(false)

  const visible = useMemo(() => {
    const words = query.trim().toLowerCase()
    const found = words ? rows.filter((row) => row.search?.toLowerCase().includes(words)) : rows
    if (!sort) return found
    const value = (row: DataRow) => row.sort?.[sort.key] ?? null
    const present = found.filter((row) => value(row) !== null)
    present.sort((a, b) => {
      const [x, y] = [value(a)!, value(b)!]
      const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))
      return sort.desc ? -order : order
    })
    return [...present, ...found.filter((row) => value(row) === null)]
  }, [rows, sort, query])

  function sortBy(column: DataColumn) {
    setSort((current) =>
      current?.key === column.key
        ? { key: column.key, desc: !current.desc }
        : { key: column.key, desc: Boolean(column.numeric) },
    )
  }

  return (
    <div>
      {searchPlaceholder && (
        <div className="relative mb-3 max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-8"
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const active = sort?.key === column.key
              const Icon = !active ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp
              return (
                <TableHead
                  key={column.key}
                  aria-sort={active ? (sort.desc ? "descending" : "ascending") : undefined}
                  className={cn(column.numeric && "text-right", column.className)}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => sortBy(column)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                        column.numeric && "flex-row-reverse",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {column.label}
                      <Icon className={cn("size-3.5", !active && "opacity-50")} />
                    </button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(expanded || !limit ? visible : visible.slice(0, limit)).map((row) => (
            <TableRow key={row.id}>
              {columns.map((column) => (
                <TableCell key={column.key} className={cn(column.numeric && "text-right tabular-nums", column.className)}>
                  {row.cells[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {visible.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {limit && visible.length > limit && (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show fewer" : `Show all ${visible.length.toLocaleString("en-US")} ${noun}`}
          </Button>
        </div>
      )}
    </div>
  )
}
