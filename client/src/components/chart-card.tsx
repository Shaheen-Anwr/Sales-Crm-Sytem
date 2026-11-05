"use client"

import { ChartColumn, Table2 } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

/** The chart's data as a table: every value is readable without hovering or telling colors apart. */
export type ChartTable = {
  columns: { label: string; numeric?: boolean }[]
  rows: (string | number)[][]
}

type Props = {
  title: string
  description?: ReactNode
  /** Controls for this chart's view, e.g. week / month / quarter. */
  action?: ReactNode
  table?: ChartTable
  className?: string
  children: ReactNode
}

export function ChartCard({ title, description, action, table, className, children }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart")
  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {(action || table) && (
          <CardAction className="flex items-center gap-2">
            {action}
            {table && (
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={view}
                onValueChange={(next) => next && setView(next as "chart" | "table")}
                aria-label={`Show ${title} as`}
              >
                <ToggleGroupItem value="chart" aria-label="Chart">
                  <ChartColumn />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Table">
                  <Table2 />
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex-1">{view === "table" && table ? <DataView table={table} /> : children}</CardContent>
    </Card>
  )
}

function DataView({ table }: { table: ChartTable }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {table.columns.map((column) => (
            <TableHead key={column.label} className={cn(column.numeric && "text-right")}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {table.rows.map((row, index) => (
          <TableRow key={index}>
            {row.map((cell, column) => (
              <TableCell key={column} className={cn(table.columns[column]?.numeric && "text-right tabular-nums")}>
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** A footnote under a chart, e.g. to explain a marker. */
export function ChartNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs text-muted-foreground">{children}</p>
}
