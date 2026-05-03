import type { OpsBarChartSeries } from '@/features/ops/components/OpsBarChart'
import type { SupabaseClient } from '@supabase/supabase-js'

function utcMidnight(d: Date): number {
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * Last 7 **UTC** calendar days (inclusive of today), stacked as **completed** (up) vs **cancelled** (down) for {@link OpsBarChart}.
 * @param referenceDate — optional “today” (e.g. tests); defaults to runtime `Date`.
 */
export function buildBookingsQueueOverviewBarSeries(
	rows: { status: string; created_at: string }[],
	referenceDate?: Date,
): OpsBarChartSeries {
	const now = referenceDate ?? new Date()
	const startDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6))
	const startMs = utcMidnight(startDay)

	const values: OpsBarChartSeries['values'] = []
	for (let i = 0; i < 7; i++) {
		const day = new Date(
			Date.UTC(
				startDay.getUTCFullYear(),
				startDay.getUTCMonth(),
				startDay.getUTCDate() + i,
			),
		)
		const label = day.toLocaleDateString('en-ZA', { weekday: 'short', timeZone: 'UTC' })
		values.push({ x: label, up: 0, down: 0 })
	}

	for (const row of rows) {
		if (row.status !== 'completed' && row.status !== 'cancelled') {
			continue
		}
		const t = new Date(row.created_at)
		if (Number.isNaN(t.getTime())) {
			continue
		}
		const idx = Math.round((utcMidnight(t) - startMs) / 86400000)
		if (idx < 0 || idx > 6) {
			continue
		}
		if (row.status === 'completed') {
			values[idx].up += 1
		} else {
			values[idx].down += 1
		}
	}

	return {
		label: 'Bookings completed vs cancelled by day',
		values,
	}
}

export async function fetchBookingsQueueOverviewChartRows(
	supabase: SupabaseClient,
): Promise<{ status: string; created_at: string }[]> {
	const now = new Date()
	const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6))
	const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))

	const { data, error } = await supabase
		.from('bookings')
		.select('status, created_at')
		.in('status', ['completed', 'cancelled'])
		.gte('created_at', from.toISOString())
		.lt('created_at', to.toISOString())

	if (error || !data) {
		return []
	}
	return data as { status: string; created_at: string }[]
}
