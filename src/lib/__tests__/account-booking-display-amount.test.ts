import { describe, expect, it } from 'vitest'

import {
	parseAccountBookingCurrentQuoteEmbed,
	resolveAccountBookingDisplayAmountZar,
} from '@/lib/account-booking-display-amount'

describe('account booking display amount', () => {
	it('prefers current quote total_zar over bookings.total_amount', () => {
		expect(
			resolveAccountBookingDisplayAmountZar({
				total_amount: 0,
				booking_quotes: { status: 'draft', total_zar: 1250.5 },
			}),
		).toBe(1250.5)
	})

	it('falls back to bookings.total_amount when quote embed is missing', () => {
		expect(
			resolveAccountBookingDisplayAmountZar({
				total_amount: 900,
				booking_quotes: null,
			}),
		).toBe(900)
	})

	it('parses array-shaped PostgREST embed', () => {
		const q = parseAccountBookingCurrentQuoteEmbed([{ status: 'sent', total_zar: '2100' }])
		expect(q?.total_zar).toBe(2100)
	})
})
