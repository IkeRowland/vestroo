import { describe, expect, it } from 'vitest'

import { buildBookingsQueueOverviewBarSeries } from '@/lib/ops-bookings-queue-overview-chart'

describe('buildBookingsQueueOverviewBarSeries', () => {
	it('buckets completed vs cancelled into the last seven UTC day columns', () => {
		/** “Today” in UTC so the 7-day window is 22–28 Apr 2026. */
		const ref = new Date(Date.UTC(2026, 3, 28, 12, 0, 0))
		const firstDay = new Date(Date.UTC(2026, 3, 22)) // Wed
		const midWeek = new Date(Date.UTC(2026, 3, 24, 12, 0, 0)) // Fri

		const series = buildBookingsQueueOverviewBarSeries(
			[
				{ status: 'completed', created_at: firstDay.toISOString() },
				{ status: 'cancelled', created_at: midWeek.toISOString() },
				{ status: 'submitted', created_at: midWeek.toISOString() },
			],
			ref,
		)

		expect(series.label).toBe('Bookings completed vs cancelled by day')
		expect(series.values).toHaveLength(7)
		const wed = series.values.find((v) => v.x === 'Wed')
		const fri = series.values.find((v) => v.x === 'Fri')
		expect(wed?.up).toBe(1)
		expect(wed?.down).toBe(0)
		expect(fri?.up).toBe(0)
		expect(fri?.down).toBe(1)
	})
})
