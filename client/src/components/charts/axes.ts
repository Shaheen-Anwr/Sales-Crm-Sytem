// Shared chart furniture: recessive hairline grid and axes, muted tick labels.

const TICK = { fill: "var(--chart-muted)", fontSize: 12 }

export const GRID = { vertical: false, stroke: "var(--chart-grid)" } as const

export const X_AXIS = {
  tickLine: false,
  axisLine: { stroke: "var(--chart-axis)" },
  tick: TICK,
  tickMargin: 8,
  minTickGap: 20,
  // Every nth label, evenly spaced, rather than whichever ones happen to fit.
  interval: "equidistantPreserveStart",
} as const

export const Y_AXIS = {
  tickLine: false,
  axisLine: false,
  tick: TICK,
  width: 52,
} as const

/** The box of a LabelList entry (bars pass it as viewBox, points as x/y). */
export function labelBox(props: { x?: unknown; y?: unknown; width?: unknown; height?: unknown; viewBox?: unknown }) {
  const box = (props.viewBox ?? props) as { x?: number; y?: number; width?: number; height?: number }
  return { x: Number(box.x ?? props.x ?? 0), y: Number(box.y ?? props.y ?? 0), width: Number(box.width ?? 0), height: Number(box.height ?? 0) }
}
