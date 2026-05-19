/** PostgREST embed shape for `booking_quotes!bookings_current_quote_id_fkey`. */
export type AccountBookingCurrentQuoteEmbed = {
	status: string | null
	total_zar: number | null
}

function parseFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}
	if (typeof value === 'string') {
		const n = Number(value)
		return Number.isFinite(n) ? n : null
	}
	return null
}

/** Normalise `booking_quotes` embed from list/detail selects (object or single-element array). */
export function parseAccountBookingCurrentQuoteEmbed(raw: unknown): AccountBookingCurrentQuoteEmbed | null {
	if (!raw || typeof raw !== 'object') {
		return null
	}
	const obj = Array.isArray(raw)
		? (raw[0] as Record<string, unknown> | undefined)
		: (raw as Record<string, unknown>)
	if (!obj || typeof obj !== 'object') {
		return null
	}
	const status = typeof obj.status === 'string' ? obj.status : null
	const total_zar = parseFiniteNumber(obj.total_zar)
	return { status, total_zar }
}

/**
 * Account portal amount column: prefer saved quote total (`current_quote_id` embed), else `bookings.total_amount`.
 * Matches ops queue rule (`queueRowDisplayTotalZar` on `/ops/bookings`).
 */
export function resolveAccountBookingDisplayAmountZar(
	row: {
		total_amount: number | null
		booking_quotes?: unknown
	},
): number | null {
	const q = parseAccountBookingCurrentQuoteEmbed(row.booking_quotes)
	if (q?.total_zar != null && Number.isFinite(q.total_zar)) {
		return q.total_zar
	}
	const ta = row.total_amount
	if (ta != null && Number.isFinite(ta)) {
		return ta
	}
	return null
}
