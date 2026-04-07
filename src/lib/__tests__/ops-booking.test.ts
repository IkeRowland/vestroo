import { describe, expect, it } from 'vitest'

import { isBookingDispatchable } from '@/lib/ops-booking'

describe('isBookingDispatchable', () => {
	it('requires paid business and payment status', () => {
		expect(
			isBookingDispatchable({ status: 'paid', payment_status: 'paid' }),
		).toBe(true)
		expect(
			isBookingDispatchable({ status: 'pending', payment_status: 'paid' }),
		).toBe(false)
		expect(
			isBookingDispatchable({ status: 'paid', payment_status: 'pending' }),
		).toBe(false)
	})
})
