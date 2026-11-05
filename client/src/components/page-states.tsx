import { SearchX } from "lucide-react"
import type { ReactNode } from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function PageHeader({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
        <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
          <SearchX className="size-5 text-muted-foreground" />
        </span>
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </CardContent>
    </Card>
  )
}

/* Loading placeholders, shown only on the first load of a page. Later changes keep the
   current content on screen (dimmed) instead, so nothing jumps. */

export function FilterBarSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={cn("h-7 rounded-lg", index === 0 ? "w-44" : "w-28")} />
      ))}
    </div>
  )
}

export function CardSkeleton({ className, height = 260 }: { className?: string; height?: number }) {
  return (
    <Card className={className} aria-hidden>
      <CardHeader>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full rounded-lg" style={{ height }} />
      </CardContent>
    </Card>
  )
}

export function KpiRowSkeleton({ tiles = 5 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6" aria-hidden>
      {Array.from({ length: tiles }, (_, index) => (
        <Card key={index} className={cn(index === 0 && "col-span-2 md:col-span-4 xl:col-span-2")}>
          <CardContent className="space-y-3">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className={cn("w-28", index === 0 ? "h-12" : "h-7")} />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <KpiRowSkeleton />
      <div className="grid gap-4 lg:grid-cols-12">
        <CardSkeleton className="lg:col-span-8" />
        <CardSkeleton className="lg:col-span-4" />
        <CardSkeleton className="lg:col-span-6" height={220} />
        <CardSkeleton className="lg:col-span-6" height={220} />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <Card aria-hidden>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}
