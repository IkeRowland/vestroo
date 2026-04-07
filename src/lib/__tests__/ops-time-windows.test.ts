import { describe, expect, it } from 'vitest'

import {
	findVehicleWindowConflicts,
	rangesOverlap,
	tripTimeWindow,
} from '@/lib/ops-time-windows'

describe('rangesOverlap', () => {
	it('detects overlap', () => {
		expect(
			rangesOverlap(
				{ startMs: 0, endMs: 100 },
				{ startMs: 50, endMs: 150 },
			),
		).toBe(true)
	})

	it('returns false when adjacent', () => {
		expect(
			rangesOverlap(
				{ startMs: 0, endMs: 100 },
				{ startMs: 100, endMs: 200 },
			),
		).toBe(false)
	})
})

describe('findVehicleWindowConflicts', () => {
	const trips = [
		{
			id: 'a',
			vehicle_id: 'v1',
			time_start_estimate: '2026-04-06T10:00:00.000Z',
			time_end_estimate: '2026-04-06T11:00:00.000Z',
			status: 'assigned',
		},
		{
			id: 'b',
			vehicle_id: 'v1',
			time_start_estimate: '2026-04-06T12:00:00.000Z',
			time_end_estimate: '2026-04-06T13:00:00.000Z',
			status: 'completed',
		},
	]

	it('flags overlapping non-terminal trip', () => {
		const candidate = tripTimeWindow({
			time_start_estimate: '2026-04-06T10:30:00.000Z',
			time_end_estimate: '2026-04-06T11:30:00.000Z',
		})
		const c = findVehicleWindowConflicts(trips, 'v1', candidate)
		expect(c).toHaveLength(1)
		expect(c[0].id).toBe('a')
	})

	it('ignores completed trips', () => {
		const candidate = tripTimeWindow({
			time_start_estimate: '2026-04-06T12:15:00.000Z',
			time_end_estimate: '2026-04-06T12:45:00.000Z',
		})
		const c = findVehicleWindowConflicts(trips, 'v1', candidate)
		expect(c).toHaveLength(0)
	})

	it('excludes trip id when swapping vehicle', () => {
		const candidate = tripTimeWindow({
			time_start_estimate: '2026-04-06T10:15:00.000Z',
			time_end_estimate: '2026-04-06T10:45:00.000Z',
		})
		const c = findVehicleWindowConflicts(trips, 'v1', candidate, 'a')
		expect(c).toHaveLength(0)
	})
})
