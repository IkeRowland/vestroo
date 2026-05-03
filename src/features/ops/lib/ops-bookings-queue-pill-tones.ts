import type { OpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'

/**
 * Tones for **`bookings.status`** on **`/ops/bookings`** (Story 17.10 / FE.17.12).
 * Separate from **`getOpsStatusPillTone`** to avoid **`pending`** / trip vs payment ambiguity.
 */
const BOOKING_STATUS_TONES: Readonly<Record<string, OpsStatusPillTone>> = {
	pending: 'neutral',
	submitted: 'info',
	triaged: 'info',
	quote_sent: 'info',
	quote_accepted: 'success',
	quote_rejected: 'danger',
	awaiting_payment: 'warning',
	paid: 'success',
	ready_to_assign: 'warning',
	assigned: 'info',
	in_progress: 'info',
	completed: 'success',
	ready_to_invoice: 'warning',
	invoiced: 'info',
	paid_invoice: 'success',
	cancelled: 'danger',
	expired: 'neutral',
}

/** Tones for **`bookings.payment_status`** on the queue. */
const PAYMENT_STATUS_TONES: Readonly<Record<string, OpsStatusPillTone>> = {
	pending: 'warning',
	paid: 'success',
	refunded: 'neutral',
	failed: 'danger',
	chargeback: 'danger',
}

export function getBookingsQueueStatusPillTone(status: string | null | undefined): OpsStatusPillTone {
	const k = String(status ?? '')
		.trim()
		.toLowerCase()
	return BOOKING_STATUS_TONES[k] ?? 'neutral'
}

export function getBookingsQueuePaymentPillTone(payment: string | null | undefined): OpsStatusPillTone {
	const k = String(payment ?? '')
		.trim()
		.toLowerCase()
	return PAYMENT_STATUS_TONES[k] ?? 'neutral'
}
