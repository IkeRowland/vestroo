import type { OpsBarChartSeries } from '@/features/ops/components/OpsBarChart'
import type { OpsDonutSlice } from '@/features/ops/components/OpsDonutChart'
import type { OpsAreaChartPoint } from '@/features/ops/components/OpsAreaChart'
import { opsDashboardCopy } from '@/features/ops/copy/ops-dashboard-copy'
import type { OpsDashboardKpiId } from '@/lib/ops-dashboard-kpis'

/** Deterministic mix — stable across SSR + tests for a given id + value. */
function hashSeed(parts: string[]): number {
	let h = 0
	const s = parts.join('|')
	for (let i = 0; i < s.length; i++) {
		h = Math.imul(31, h) + s.charCodeAt(i)
		h |= 0
	}
	return Math.abs(h)
}

/**
 * MVP B (Story 17.6): seven-point spark preview anchored to the loader value — not historical DB series.
 */
export function opsDashboardDemoSparklinePoints(
	id: OpsDashboardKpiId,
	currentValue: number,
): number[] {
	const n = 7
	const last = Number.isFinite(currentValue) ? Math.max(0, Math.round(currentValue)) : 0
	const seed = hashSeed([id, String(last)])
	const points: number[] = []
	for (let i = 0; i < n; i++) {
		const t = i / (n - 1 || 1)
		const wobble = (((seed >> (i * 5)) & 0xff) / 255 - 0.5) * 0.35
		const base = last === 0 ? (seed % 7) + i : last * (0.42 + 0.58 * t)
		points.push(Math.max(0, Math.round(base * (1 + wobble))))
	}
	points[n - 1] = last
	return points
}

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Illustrative revenue curve — deterministic demo only (MVP B). */
export function opsDashboardDemoRevenueWeekPoints(): OpsAreaChartPoint[] {
	const seed = hashSeed(['revenue-week-demo', 'v1'])
	return WEEK_LABELS.map((x, i) => {
		const wave = Math.sin((i / 6) * Math.PI) * 12 + ((seed >> (i * 4)) & 0xf)
		const y = Math.max(2, Math.round(48 + wave + i * 3))
		return { x, y }
	})
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'] as const

/**
 * Wheelzie-style “bookings overview” bars — demo only (MVP B). One month stands taller (reference spike cue).
 */
export function opsDashboardDemoActivityBarSeries(): OpsBarChartSeries {
	const seed = hashSeed(['dash-activity-bars', 'v2'])
	return {
		label: 'Trip and booking touchpoints by month (preview)',
		values: MONTH_ABBR.map((x, i) => {
			const base = 12 + ((seed >> (i * 4)) & 0x1f) + i * 2
			const up = i === 5 ? 42 + (seed & 0xf) : Math.max(4, Math.round(base))
			const down = Math.max(0, Math.min(6, 2 + (i % 4)))
			return { x, up, down }
		}),
	}
}

export function opsDashboardTripMixSlices(values: {
	trips_en_route: number
	trips_booking: number
	trips_completed_7d_utc: number
}): OpsDonutSlice[] {
	const onTrip = Math.max(0, Math.round(values.trips_en_route))
	const scheduled = Math.max(0, Math.round(values.trips_booking))
	const completed = Math.max(0, Math.round(values.trips_completed_7d_utc))
	const cancelled = 0

	return [
		{ label: opsDashboardCopy.segmentOnTrip, value: onTrip, tone: 'accent' },
		{ label: opsDashboardCopy.segmentScheduled, value: scheduled, tone: 'warning' },
		{ label: opsDashboardCopy.segmentCompleted, value: completed, tone: 'success' },
		{ label: opsDashboardCopy.segmentCancelled, value: cancelled, tone: 'danger' },
	]
}
