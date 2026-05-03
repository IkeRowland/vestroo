/**
 * Epic 14 / Story 14.5 — **US-C4** trip summary for expired quote links (no payment amounts, no PII in URLs).
 */
export type QuoteExpiredTripSummary = {
	originLabel: string
	destinationLabel: string
	/** Human-readable pickup instant, or null if unknown. */
	pickupDisplay: string | null
	passengers: number | null
}

type BookingTripRow = {
	origin_address: string | null
	destination_address: string | null
	origin_name: string | null
	destination_name: string | null
	passenger_count: number | null
	pickup_datetime: string | null
}

/**
 * Builds a safe trip summary for the expired-quote UI. Returns **`null`** when there is nothing
 * meaningful to show (minimal fallback per **14.5** AC5).
 */
export function buildTripSummaryFromBookingRow(row: BookingTripRow): QuoteExpiredTripSummary | null {
	const origin =
		(row.origin_address?.trim() || row.origin_name?.trim() || '').trim() || ''
	const dest =
		(row.destination_address?.trim() || row.destination_name?.trim() || '').trim() || ''
	let pickupDisplay: string | null = null
	if (row.pickup_datetime) {
		const d = new Date(row.pickup_datetime)
		if (!Number.isNaN(d.getTime())) {
			pickupDisplay = d.toLocaleString('en-ZA', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })
		}
	}
	const passengers =
		typeof row.passenger_count === 'number' && row.passenger_count > 0 ? row.passenger_count : null

	if (!origin && !dest && !pickupDisplay && passengers == null) {
		return null
	}

	return {
		originLabel: origin || '—',
		destinationLabel: dest || '—',
		pickupDisplay,
		passengers,
	}
}
