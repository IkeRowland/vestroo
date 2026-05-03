/**
 * Shared strings for ops SVG chart primitives (FE.17.7 / Story 17.5) — NFR.17.8.
 */
export const opsChartsCopy = {
	/** Shown when there is no numeric / slice data to plot (AC8). */
	noDataForPeriod: 'No data for this period.',
	/** Stacked bar: lower segment (e.g. completed / “up” in epic naming). */
	barSegmentUp: 'Done',
	/** Stacked bar: upper segment (e.g. cancelled / “down” in epic naming). */
	barSegmentDown: 'Cancelled',
} as const
