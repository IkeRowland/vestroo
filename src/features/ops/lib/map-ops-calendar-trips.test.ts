import { describe, expect, it } from 'vitest'

import { mapTripsToCalendarWeekData } from '@/features/ops/lib/map-ops-calendar-trips'

describe('mapTripsToCalendarWeekData', () => {
	it('maps trip to event and rail', () => {
		const { events, railByTripId } = mapTripsToCalendarWeekData(
			[
				{
					id: 'trip-1',
					status: 'assigned',
					time_start_estimate: '2026-04-28T10:00:00.000Z',
					time_end_estimate: '2026-04-28T11:00:00.000Z',
					vehicle_id: 'v1',
					chauffeur_id: 'd1',
					ops_delay_note: null,
					service_type: 'point_to_point',
					vehicles: { name: 'Shuttle A' },
					booking_trips: [
						{
							bookings: {
								customer_name: 'Acme Corp',
								rider_name: null,
								origin_name: 'Airport',
								destination_name: 'Hotel',
							},
						},
					],
				},
			],
			{ d1: 'Jamie Driver' },
		)
		expect(events).toHaveLength(1)
		expect(events[0]!.title).toBe('Airport → Hotel')
		expect(events[0]!.tone).toBe('info')
		expect(railByTripId['trip-1']!.driverName).toBe('Jamie Driver')
		expect(railByTripId['trip-1']!.vehicleName).toBe('Shuttle A')
	})
})
