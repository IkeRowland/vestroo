import { describe, expect, it } from 'vitest'

import {
	extractOpsBookingVehicleCategoryNameForDetail,
	extractOpsBookingVehicleNameForDetail,
	opsBookingServiceTypeLabel,
	parseTripRequestSlide2FromBookingMetadata,
	type OpsBookingDetailRow,
} from '@/lib/ops-booking-detail'

describe('parseTripRequestSlide2FromBookingMetadata', () => {
	it('reads slide2 name and classification', () => {
		const meta = {
			trip_request: {
				slide2: {
					id: 'veh-1',
					name: '2026 BMW X5',
					classification: 'SUV class',
					passengerCapacity: 4,
					luggageCapacityLabel: '3 bags',
				},
			},
		}
		expect(parseTripRequestSlide2FromBookingMetadata(meta)).toEqual({
			name: '2026 BMW X5',
			classification: 'SUV class',
		})
	})

	it('returns null when slide2 missing', () => {
		expect(parseTripRequestSlide2FromBookingMetadata({ trip_request: {} })).toBeNull()
		expect(parseTripRequestSlide2FromBookingMetadata(null)).toBeNull()
	})
})

describe('detail vehicle / category fallbacks', () => {
	const baseRow = {
		booking_trips: [],
		booking_metadata: {
			trip_request: {
				slide2: {
					id: 'x',
					name: 'Mercedes V-Class',
					classification: 'MPV class',
					passengerCapacity: 7,
					luggageCapacityLabel: '—',
				},
			},
		},
	} satisfies Pick<OpsBookingDetailRow, 'booking_trips' | 'booking_metadata'>

	it('uses metadata when no booking_trips trip', () => {
		expect(extractOpsBookingVehicleNameForDetail(baseRow)).toBe('Mercedes V-Class')
		expect(extractOpsBookingVehicleCategoryNameForDetail(baseRow)).toBe('MPV class')
	})
})

describe('opsBookingServiceTypeLabel', () => {
	it('uses trip service_type when present', () => {
		const row = {
			booking_intent: 'trip_request',
			booking_trips: [
				{
					sort_order: 0,
					trips: {
						service_type: 'charter',
						vehicles: null,
					},
				},
			],
		} as unknown as OpsBookingDetailRow
		expect(opsBookingServiceTypeLabel(row)).toBe('Charter')
	})

	it('falls back to Charter for trip_request without trip', () => {
		const row = {
			booking_intent: 'trip_request',
			booking_trips: [],
			booking_metadata: {},
		} as unknown as OpsBookingDetailRow
		expect(opsBookingServiceTypeLabel(row)).toBe('Charter')
	})
})
