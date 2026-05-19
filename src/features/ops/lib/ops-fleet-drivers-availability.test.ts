import { describe, expect, it } from 'vitest'

import {
	fleetDriverInTripWindowById,
	fleetDriverShiftFromProfile,
	fleetDriverShiftStatusPillKey,
	fleetDriverTripStatus,
	fleetDriverTripStatusPillKey,
	fleetTripRowCoversNow,
} from '@/features/ops/lib/ops-fleet-drivers-availability'

describe('fleetDriverShiftFromProfile', () => {
	it('maps inactive profile to inactive shift', () => {
		expect(fleetDriverShiftFromProfile('inactive')).toBe('inactive')
	})
	it('maps active profile to active shift', () => {
		expect(fleetDriverShiftFromProfile('active')).toBe('active')
	})
})

describe('fleetDriverTripStatus', () => {
	it('unavailable when shift inactive regardless of window', () => {
		expect(fleetDriverTripStatus('inactive', true)).toBe('unavailable')
		expect(fleetDriverTripStatus('inactive', false)).toBe('unavailable')
	})
	it('busy when active and in window', () => {
		expect(fleetDriverTripStatus('active', true)).toBe('busy')
	})
	it('idle when active and not in window', () => {
		expect(fleetDriverTripStatus('active', false)).toBe('idle')
	})
})

describe('fleetDriverTripStatusPillKey / fleetDriverShiftStatusPillKey', () => {
	it('trip keys', () => {
		expect(fleetDriverTripStatusPillKey('idle')).toBe('fleet_drivers_trip_idle')
		expect(fleetDriverTripStatusPillKey('busy')).toBe('fleet_drivers_trip_busy')
		expect(fleetDriverTripStatusPillKey('unavailable')).toBe('fleet_drivers_trip_unavailable')
	})
	it('shift keys', () => {
		expect(fleetDriverShiftStatusPillKey('active')).toBe('fleet_drivers_shift_active')
		expect(fleetDriverShiftStatusPillKey('inactive')).toBe('fleet_drivers_shift_inactive')
	})
})

describe('fleetTripRowCoversNow', () => {
	const t0 = '2026-05-14T12:00:00.000Z'
	const t1 = '2026-05-14T14:00:00.000Z'
	const mid = new Date('2026-05-14T13:00:00.000Z').getTime()

	it('true when now inside window', () => {
		expect(
			fleetTripRowCoversNow(
				{
					status: 'assigned',
					chauffeur_id: 'd1',
					time_start_estimate: t0,
					time_end_estimate: t1,
				},
				mid,
			),
		).toBe(true)
	})

	it('uses revised end when present', () => {
		expect(
			fleetTripRowCoversNow(
				{
					status: 'on_trip',
					chauffeur_id: 'd1',
					time_start_estimate: t0,
					time_end_estimate: '2026-05-14T12:30:00.000Z',
					ops_revised_time_end_estimate: t1,
				},
				mid,
			),
		).toBe(true)
	})

	it('false for terminal trips', () => {
		expect(
			fleetTripRowCoversNow(
				{
					status: 'completed',
					chauffeur_id: 'd1',
					time_start_estimate: t0,
					time_end_estimate: t1,
				},
				mid,
			),
		).toBe(false)
	})
})

describe('fleetDriverInTripWindowById', () => {
	it('aggregates by chauffeur id', () => {
		const t0 = '2026-05-14T12:00:00.000Z'
		const t1 = '2026-05-14T14:00:00.000Z'
		const now = new Date('2026-05-14T13:00:00.000Z').getTime()
		const m = fleetDriverInTripWindowById(
			[
				{
					status: 'assigned',
					chauffeur_id: 'a',
					time_start_estimate: t0,
					time_end_estimate: t1,
				},
				{
					status: 'assigned',
					chauffeur_id: 'b',
					time_start_estimate: '2026-06-01T10:00:00.000Z',
					time_end_estimate: '2026-06-01T11:00:00.000Z',
				},
			],
			now,
		)
		expect(m.a).toBe(true)
		expect(m.b).toBeUndefined()
	})
})
