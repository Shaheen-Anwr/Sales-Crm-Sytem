"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useOptimistic, useTransition } from "react"

export type ParamChanges = Record<string, string | null | undefined>

/**
 * Read and change the page's query string.
 *
 * Changes run in a transition: the current page stays on screen until the new
 * one has rendered, and the control shows the new value at once (useOptimistic).
 * Put `data-pending={isPending || undefined}` on the control: <main> is a
 * `group`, so content marked `group-has-data-pending:opacity-50` dims meanwhile
 * instead of flashing skeletons.
 */
export function useUrlParams() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useOptimistic(searchParams.toString())

  function update(changes: ParamChanges, { keepPage = false, replace = false } = {}) {
    const next = new URLSearchParams(query)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!keepPage) next.delete("page")
    const nextQuery = next.toString()
    const href = nextQuery ? `${pathname}?${nextQuery}` : pathname
    startTransition(() => {
      setQuery(nextQuery)
      if (replace) router.replace(href, { scroll: false })
      else router.push(href, { scroll: false })
    })
  }

  return { params: new URLSearchParams(query), update, isPending }
}
