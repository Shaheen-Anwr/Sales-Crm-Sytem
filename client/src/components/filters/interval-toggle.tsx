"use client"

import { useUrlParams } from "@/components/filters/use-url-params"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { parseInterval } from "@/lib/filters"

/** Week / month / quarter for the charts over time. It changes the grouping, not which deals count. */
export function IntervalToggle() {
  const { params, update, isPending } = useUrlParams()
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={parseInterval(params.get("interval") ?? undefined)}
      onValueChange={(next) => next && update({ interval: next === "month" ? null : next }, { keepPage: true })}
      data-pending={isPending || undefined}
      aria-label="Group by"
    >
      <ToggleGroupItem value="week">Week</ToggleGroupItem>
      <ToggleGroupItem value="month">Month</ToggleGroupItem>
      <ToggleGroupItem value="quarter">Quarter</ToggleGroupItem>
    </ToggleGroup>
  )
}
