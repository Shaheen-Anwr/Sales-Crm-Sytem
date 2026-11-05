"use client"

import { Tooltip as TooltipPrimitive } from "radix-ui"
import type { ReactNode } from "react"

import { TooltipCard, type TooltipRow } from "@/components/charts/tooltip-card"

/** Hover and keyboard-focus readout for an HTML chart mark (a bar-list row, a funnel stage). */
export function MarkTooltip({ title, rows, children }: { title: string; rows: TooltipRow[]; children: ReactNode }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          align="center"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
        >
          <TooltipCard title={title} rows={rows} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
