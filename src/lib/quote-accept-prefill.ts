/**
 * Q17 (Epic 14): deep-link back to the booking funnel using **trip fields only** (addresses, date,
 * passengers) — no customer PII in the query string.
 */
export function buildBookSearchPrefillHrefFromBooking(
	booking: {
		origin_address: string | null
		destination_address: string | null
		passenger_count: number | null
		pickup_datetime: string | null
		booking_intent: string | null
	},
	bookSearchPath = '/book/search',
): string {
	const q = new URLSearchParams()
	if (booking.origin_address?.trim()) {
		q.set('originHint', booking.origin_address.trim())
	}
	if (booking.destination_address?.trim()) {
		q.set('destinationHint', booking.destination_address.trim())
	}
	if (typeof booking.passenger_count === 'number' && booking.passenger_count > 0) {
		q.set('passengers', String(booking.passenger_count))
	}
	if (booking.pickup_datetime) {
		const d = new Date(booking.pickup_datetime)
		if (!Number.isNaN(d.getTime())) {
			q.set('tripDate', d.toISOString())
		}
	}
	if (booking.booking_intent?.trim()) {
		q.set('intent', booking.booking_intent.trim())
	}
	const qs = q.toString()
	return qs ? `${bookSearchPath}?${qs}` : bookSearchPath
}

/** Trip fields for “Book this again” (Story 15.8) — same as quote-accept hints but **no** `tripDate`. */
export type BookAgainSearchPrefillInput = {
	origin_address: string | null
	destination_address: string | null
	passenger_count: number | null
	booking_intent: string | null
	/** First trip `service_type` from portal detail — opaque hint for vehicle preselect (not a price). */
	service_type: string | null
}

/**
 * Story 15.8 — deep-link to `/book/search` with **non-sensitive** trip hints only (no price, no quote id).
 * **Omits** pickup date/time per epic stale-pricing guidance.
 */
export function buildBookAgainSearchPrefillHrefFromBooking(
	booking: BookAgainSearchPrefillInput,
	bookSearchPath = '/book/search',
): string {
	const q = new URLSearchParams()
	if (booking.origin_address?.trim()) {
		q.set('originHint', booking.origin_address.trim())
	}
	if (booking.destination_address?.trim()) {
		q.set('destinationHint', booking.destination_address.trim())
	}
	if (typeof booking.passenger_count === 'number' && booking.passenger_count > 0) {
		q.set('passengers', String(booking.passenger_count))
	}
	if (booking.booking_intent?.trim()) {
		q.set('intent', booking.booking_intent.trim())
	}
	if (booking.service_type?.trim()) {
		q.set('serviceTypeHint', booking.service_type.trim())
	}
	q.set('omitTripDate', '1')
	const qs = q.toString()
	return qs ? `${bookSearchPath}?${qs}` : `${bookSearchPath}?omitTripDate=1`
}

/**
 * Best-effort match from portal `trips.service_type` text to a catalog / quote vehicle `id`.
 * Tries UUID equality on hint, then case-insensitive substring match on `name`.
 */
export function pickVehicleIdFromServiceTypeHint(
	hint: string | null | undefined,
	vehicles: readonly { id: string; name: string }[],
): string | null {
	if (!hint?.trim()) return null
	const t = hint.trim()
	const byId = vehicles.find((v) => v.id === t)
	if (byId) return byId.id
	const tl = t.toLowerCase().replaceAll('_', ' ')
	for (const v of vehicles) {
		const nl = v.name.toLowerCase()
		if (nl === tl || nl.includes(tl) || tl.includes(nl)) {
			return v.id
		}
	}
	return null
}
