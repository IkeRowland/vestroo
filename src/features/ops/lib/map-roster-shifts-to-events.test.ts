import { describe, expect, it } from 'vitest'

import {
	mapRosterSchedulesToCalendarEvents,
	rosterShiftDayBandLocal,
} from '@/features/ops/lib/map-roster-shifts-to-events'

describe('map-roster-shifts-to-events', () => {
	it('rosterShiftDayBandLocal morning band', () => {
		const { start, end } = rosterShiftDayBandLocal('2026-04-28', 'morning')
		expect(start.getHours()).toBe(6)
		expect(end.getHours()).toBe(14)
	})

	it('maps schedule to calendar event', () => {
		const events = mapRosterSchedulesToCalendarEvents(
			[
				{
					id: 'shift-1',
					chauffeur_id: 'driver-1',
					work_date: '2026-04-28',
					shift: 'morning',
					vehicle_id: 'v1',
					status: 'scheduled',
					total_working_hours: 8,
				},
			],
			{ 'driver-1': 'Alex' },
			{ v1: 'Van 1' },
		)
		expect(events).toHaveLength(1)
		expect(events[0]!.title).toBe('Alex')
		expect(events[0]!.id).toBe('shift-1')
	})
})
