/**
 * Booking statuses we never overwrite when a trip completes (Epic 13.9).
 * `invoiced` / `paid_invoice` are terminal for the trip-complete hook; finance UI moves them forward.
 */
export const BOOKING_STATUSES_TERMINAL_FOR_TRIP_COMPLETE_HOOK = new Set<string>([
	'cancelled',
	'expired',
	'invoiced',
	'paid_invoice',
])

export type TripCompleteBookingInvoiceArgs = {
	clientType: string | null | undefined
	bookingStatus: string | null | undefined
}

/**
 * When an ops trip moves to `completed`, account-client bookings may be set to `ready_to_invoice`.
 * Walk-ins and terminal booking rows are left unchanged.
 */
export function shouldSetBookingReadyToInvoiceOnTripCompleted(
	args: TripCompleteBookingInvoiceArgs,
): boolean {
	if (args.clientType !== 'account_client') {
		return false
	}
	const s = args.bookingStatus ?? ''
	if (s === 'ready_to_invoice') {
		return false
	}
	if (BOOKING_STATUSES_TERMINAL_FOR_TRIP_COMPLETE_HOOK.has(s)) {
		return false
	}
	return true
}

export function appendBookingStatusHistoryEntry(
	current: unknown,
	from: string,
	to: string,
	source: string,
): unknown[] {
	const historyRaw = current
	const history = Array.isArray(historyRaw) ? [...historyRaw] : []
	history.push({
		at: new Date().toISOString(),
		from,
		to,
		source,
	})
	return history
}
