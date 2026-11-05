"use client"

import { RotateCcw, ServerCrash } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// In production, errors from Server Components arrive with their message hidden,
// so the page explains the usual cause instead of showing it.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
          <ServerCrash className="size-5 text-muted-foreground" />
        </span>
        <h1 className="text-base font-medium">The dashboard couldn&apos;t load its data</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The data comes from the Django API, so check that it&apos;s running. From the project folder:
        </p>
        <code className="mt-1 max-w-full overflow-x-auto rounded-md bg-muted px-3 py-2 text-left font-mono text-xs whitespace-nowrap">
          cd api && source venv/bin/activate && python manage.py runserver
        </code>
        <Button className="mt-4" onClick={() => retry()}>
          <RotateCcw /> Try again
        </Button>
      </CardContent>
    </Card>
  )
}
