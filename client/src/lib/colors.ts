// Categorical colors follow the entity, never its rank: each office (or product
// series) keeps its slot whatever the filters leave on screen.

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)"]

/**
 * Each name's color, by its place in the full alphabetical list. Only three slots are
 * validated for color-vision deficiencies, so a fourth name and beyond get gray.
 */
export function entityColors(names: string[]) {
  const sorted = [...new Set(names)].sort((a, b) => a.localeCompare(b))
  return new Map(sorted.map((name, index) => [name, SERIES[index] ?? "var(--chart-muted)"]))
}
