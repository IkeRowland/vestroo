import { describe, expect, it } from 'vitest'

import { effectiveBookingStatusKeyForOps } from '@/lib/ops-booking-detail'

describe('effectiveBookingStatusKeyForOps', () => {
	const embedCompleted = [
		{
			sort_order: 0,
			trips: { status: 'completed', vehicles: { name: 'V' } },
		},
	]

	it('maps ready_to_assign + trip completed → completed', () => {
		expect(effectiveBookingStatusKeyForOps('ready_to_assign', embedCompleted)).toBe('completed')
	})

	it('preserves ready_to_invoice when trip completed (account invoicing)', () => {
		expect(effectiveBookingStatusKeyForOps('ready_to_invoice', embedCompleted)).toBe(
			'ready_to_invoice',
		)
	})

	it('maps ready_to_assign + trip cancelled → cancelled', () => {
		const embed = [{ sort_order: 0, trips: { status: 'cancelled' } }]
		expect(effectiveBookingStatusKeyForOps('ready_to_assign', embed)).toBe('cancelled')
	})

	it('returns booking status when no trip embed', () => {
		expect(effectiveBookingStatusKeyForOps('ready_to_assign', null)).toBe('ready_to_assign')
	})
})
