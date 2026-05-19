import { describe, expect, it } from 'vitest'

import {
	assessBulkInvoiceEligibility,
	opsBookingQueueDisplayTotalZar,
} from '@/lib/ops-bulk-invoice-eligibility'
import type { OpsBookingsQueueRow } from '@/lib/ops-bookings-queue-select'

const accountId = 'a1111111-1111-4111-8111-111111111111'

function row(partial: Partial<OpsBookingsQueueRow>): OpsBookingsQueueRow {
	return {
		id: 'b1111111-1111-4111-8111-111111111111',
		payment_reference: 'PAY-1',
		status: 'ready_to_invoice',
		payment_status: null,
		booking_intent: null,
		client_type: 'account_client',
		customer_account_id: accountId,
		pickup_datetime: null,
		origin_name: 'A',
		destination_name: 'B',
		customer_name: 'Rider',
		customer_email: 'r@example.com',
		total_amount: 100,
		availability_checked_at: null,
		created_at: '2026-01-01T00:00:00.000Z',
		booking_trips: [],
		booking_quotes: { status: 'sent', total_zar: 250 },
		...partial,
	}
}

describe('ops-bulk-invoice-eligibility', () => {
	it('accepts ready_to_invoice account booking with quote total', () => {
		const r = row({})
		expect(assessBulkInvoiceEligibility(r, accountId)).toEqual({
			eligible: true,
			amountZar: 250,
			bookingReference: 'PAY-1',
		})
	})

	it('rejects wrong status', () => {
		const check = assessBulkInvoiceEligibility(row({ status: 'invoiced' }), accountId)
		expect(check.eligible).toBe(false)
	})

	it('uses booking total when quote embed missing', () => {
		expect(opsBookingQueueDisplayTotalZar(row({ booking_quotes: null }))).toBe(100)
	})
})
