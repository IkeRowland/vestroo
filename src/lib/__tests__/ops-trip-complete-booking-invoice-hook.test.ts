import { describe, expect, it } from 'vitest'

import { shouldSetBookingReadyToInvoiceOnTripCompleted } from '@/lib/ops-trip-complete-booking-invoice-hook'

describe('shouldSetBookingReadyToInvoiceOnTripCompleted', () => {
	it('returns true for account_client with non-terminal status', () => {
		expect(
			shouldSetBookingReadyToInvoiceOnTripCompleted({
				clientType: 'account_client',
				bookingStatus: 'in_progress',
			}),
		).toBe(true)
	})

	it('returns false for walk_in', () => {
		expect(
			shouldSetBookingReadyToInvoiceOnTripCompleted({
				clientType: 'walk_in',
				bookingStatus: 'in_progress',
			}),
		).toBe(false)
	})

	it('returns false when booking is cancelled', () => {
		expect(
			shouldSetBookingReadyToInvoiceOnTripCompleted({
				clientType: 'account_client',
				bookingStatus: 'cancelled',
			}),
		).toBe(false)
	})

	it('returns false when booking is expired', () => {
		expect(
			shouldSetBookingReadyToInvoiceOnTripCompleted({
				clientType: 'account_client',
				bookingStatus: 'expired',
			}),
		).toBe(false)
	})

	it('returns false when already ready_to_invoice (idempotent retry)', () => {
		expect(
			shouldSetBookingReadyToInvoiceOnTripCompleted({
				clientType: 'account_client',
				bookingStatus: 'ready_to_invoice',
			}),
		).toBe(false)
	})

	it('returns false for invoiced / paid_invoice', () => {
		expect(
			shouldSetBookingReadyToInvoiceOnTripCompleted({
				clientType: 'account_client',
				bookingStatus: 'invoiced',
			}),
		).toBe(false)
		expect(
			shouldSetBookingReadyToInvoiceOnTripCompleted({
				clientType: 'account_client',
				bookingStatus: 'paid_invoice',
			}),
		).toBe(false)
	})
})
