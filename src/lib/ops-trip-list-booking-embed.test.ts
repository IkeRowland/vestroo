import { describe, expect, it } from 'vitest'

import { opsTripListRefLabel, parseOpsTripListBookingEmbed } from '@/lib/ops-trip-list-booking-embed'

const TRIP_ID = '373da18e-272c-4239-96f5-fbc5c7cc75cc'

describe('parseOpsTripListBookingEmbed', () => {
	it('reads first booking from booking_trips array embed', () => {
		const row = {
			booking_trips: [
				{
					bookings: {
						id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
						payment_reference: 'VST-87597793',
						pickup_datetime: '2026-05-25T18:15:00.000Z',
						customer_name: 'Betty Doe',
						customer_email: 'betty@gmail.com',
						client_type: 'walk_in',
						origin_name: 'O.R. Tambo International Airport',
						destination_name: 'Sandton City',
						customer_accounts: null,
					},
				},
			],
		}
		const b = parseOpsTripListBookingEmbed(row)
		expect(b.payment_reference).toBe('VST-87597793')
		expect(b.customer_name).toBe('Betty Doe')
		expect(opsTripListRefLabel(TRIP_ID, b)).toBe('VST-87597793')
	})

	it('falls back ref label to trip id when no embed', () => {
		const b = parseOpsTripListBookingEmbed({})
		expect(opsTripListRefLabel(TRIP_ID, b)).toBe('373da18e…')
	})
})
