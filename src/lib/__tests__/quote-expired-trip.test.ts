import { describe, expect, it } from 'vitest'

import { buildTripSummaryFromBookingRow } from '@/lib/quote-expired-trip'

describe('buildTripSummaryFromBookingRow', () => {
	it('returns structured labels when addresses exist', () => {
		const s = buildTripSummaryFromBookingRow({
			origin_address: 'Cape Town',
			destination_address: 'Stellenbosch',
			origin_name: null,
			destination_name: null,
			passenger_count: 2,
			pickup_datetime: '2026-05-01T10:00:00.000Z',
		})
		expect(s).not.toBeNull()
		expect(s!.originLabel).toBe('Cape Town')
		expect(s!.destinationLabel).toBe('Stellenbosch')
		expect(s!.passengers).toBe(2)
		expect(s!.pickupDisplay).toBeTruthy()
	})

	it('falls back to name columns when addresses are blank', () => {
		const s = buildTripSummaryFromBookingRow({
			origin_address: null,
			destination_address: null,
			origin_name: 'CBD',
			destination_name: 'Airport',
			passenger_count: 1,
			pickup_datetime: null,
		})
		expect(s).not.toBeNull()
		expect(s!.originLabel).toBe('CBD')
		expect(s!.destinationLabel).toBe('Airport')
	})

	it('returns null when there is nothing to show', () => {
		expect(
			buildTripSummaryFromBookingRow({
				origin_address: null,
				destination_address: null,
				origin_name: null,
				destination_name: null,
				passenger_count: null,
				pickup_datetime: null,
			}),
		).toBeNull()
	})
})
