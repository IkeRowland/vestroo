/**
 * Parse `booking_trips → bookings` embed from `/ops/trips` list rows (PostgREST may return object or array).
 */

export type OpsTripListBookingSlice = {
	booking_id: string | null
	payment_reference: string | null
	pickup_datetime: string | null
	customer_name: string | null
	customer_email: string | null
	linked_account_name: string | null
	client_type: string | null
	origin_name: string | null
	destination_name: string | null
}

function asNullableString(v: unknown): string | null {
	if (v == null) return null
	if (typeof v === 'string') return v
	return null
}

function linkedAccountNameFromCustomerAccounts(ca: unknown): string | null {
	if (!ca) return null
	if (Array.isArray(ca)) {
		const first = ca[0] as { name?: unknown } | undefined
		return typeof first?.name === 'string' ? first.name : null
	}
	if (typeof ca === 'object' && ca !== null && 'name' in ca) {
		const n = (ca as { name: unknown }).name
		return typeof n === 'string' ? n : null
	}
	return null
}

const emptySlice: OpsTripListBookingSlice = {
	booking_id: null,
	payment_reference: null,
	pickup_datetime: null,
	customer_name: null,
	customer_email: null,
	linked_account_name: null,
	client_type: null,
	origin_name: null,
	destination_name: null,
}

export function parseOpsTripListBookingEmbed(row: Record<string, unknown>): OpsTripListBookingSlice {
	const btRaw = row.booking_trips
	const btRows = Array.isArray(btRaw) ? btRaw : btRaw != null ? [btRaw] : []
	for (const bt of btRows) {
		if (!bt || typeof bt !== 'object') continue
		const bRaw = (bt as Record<string, unknown>).bookings
		const booking = Array.isArray(bRaw) ? bRaw[0] : bRaw
		if (!booking || typeof booking !== 'object') continue
		const b = booking as Record<string, unknown>
		const bookingId = asNullableString(b.id)
		return {
			booking_id: bookingId,
			payment_reference: asNullableString(b.payment_reference),
			pickup_datetime: asNullableString(b.pickup_datetime),
			customer_name: asNullableString(b.customer_name),
			customer_email: asNullableString(b.customer_email),
			linked_account_name: linkedAccountNameFromCustomerAccounts(b.customer_accounts),
			client_type: asNullableString(b.client_type),
			origin_name: asNullableString(b.origin_name),
			destination_name: asNullableString(b.destination_name),
		}
	}
	return { ...emptySlice }
}

export function opsTripListRefLabel(tripId: string, b: OpsTripListBookingSlice): string {
	const ref = b.payment_reference?.trim()
	if (ref) return ref
	if (b.booking_id) return `${b.booking_id.slice(0, 8)}…`
	return `${tripId.slice(0, 8)}…`
}
