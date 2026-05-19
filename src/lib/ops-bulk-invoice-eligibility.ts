import { bookingReferenceFromRow } from '@/lib/ops-invoicing-queue'
import type { OpsBookingsQueueRow } from '@/lib/ops-bookings-queue-select'

function bookingQueueCurrentQuoteEmbed(row: OpsBookingsQueueRow): {
	status: string | null
	total_zar: number | null
} | null {
	const raw = row.booking_quotes
	if (!raw || typeof raw !== 'object') {
		return null
	}
	const obj = Array.isArray(raw)
		? (raw[0] as Record<string, unknown> | undefined)
		: (raw as Record<string, unknown>)
	if (!obj || typeof obj !== 'object') {
		return null
	}
	const status = obj.status
	const total_zar = obj.total_zar
	const st = typeof status === 'string' ? status : null
	let tz: number | null = null
	if (typeof total_zar === 'number' && Number.isFinite(total_zar)) {
		tz = total_zar
	} else if (typeof total_zar === 'string') {
		const n = Number(total_zar)
		tz = Number.isFinite(n) ? n : null
	}
	return { status: st, total_zar: tz }
}

/** Same rule as `/ops/bookings`: current quote total when valid, else `bookings.total_amount`. */
export function opsBookingQueueDisplayTotalZar(row: OpsBookingsQueueRow): number | null {
	const q = bookingQueueCurrentQuoteEmbed(row)
	if (q?.total_zar != null && Number.isFinite(q.total_zar)) {
		return q.total_zar
	}
	return row.total_amount
}

export type BulkInvoiceEligibility =
	| {
			eligible: true
			amountZar: number
			bookingReference: string
	  }
	| { eligible: false; reason: string }

/**
 * Ops bulk invoice (account client detail + future callers).
 * Aligns with `/ops/invoicing` Ready tab: `account_client` + `ready_to_invoice` + positive quote amount.
 */
export function assessBulkInvoiceEligibility(
	row: OpsBookingsQueueRow,
	expectedAccountId: string,
): BulkInvoiceEligibility {
	if (row.client_type !== 'account_client') {
		return { eligible: false, reason: 'Walk-in bookings cannot be bulk-invoiced here.' }
	}
	if (row.customer_account_id !== expectedAccountId) {
		return { eligible: false, reason: 'Booking does not belong to this account client.' }
	}
	const status = row.status ?? ''
	if (status !== 'ready_to_invoice') {
		return {
			eligible: false,
			reason: `Must be ready to invoice (current: ${status || 'unknown'}).`,
		}
	}
	const amountZar = opsBookingQueueDisplayTotalZar(row)
	if (amountZar == null || !Number.isFinite(amountZar) || amountZar <= 0) {
		return { eligible: false, reason: 'Missing or non-positive quote amount.' }
	}
	const bookingReference = bookingReferenceFromRow(row.payment_reference, row.id)
	return { eligible: true, amountZar, bookingReference }
}

export function bulkInvoiceLineItemLabel(row: OpsBookingsQueueRow, bookingReference: string): string {
	const route =
		row.origin_name?.trim() && row.destination_name?.trim()
			? `${row.origin_name.trim()} → ${row.destination_name.trim()}`
			: row.origin_name?.trim() || row.destination_name?.trim() || ''
	return route.length > 0 ? `${bookingReference} — ${route}` : bookingReference
}
