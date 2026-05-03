import type { SupabaseClient } from '@supabase/supabase-js'

import { loadResolvedBookingQuoteForOps, type OpsBookingQuoteDetailRow } from '@/lib/booking-current-quote'

/** Full booking row for account portal detail (parity with list + summary fields). */
export const ACCOUNT_PORTAL_BOOKING_DETAIL_SELECT = `
  id,
  payment_reference,
  status,
  payment_status,
  booking_intent,
  customer_account_id,
  client_type,
  pickup_datetime,
  origin_name,
  destination_name,
  total_amount,
  passenger_count,
  rider_name,
  rider_email,
  rider_phone,
  current_quote_id,
  flight_number,
  hourly_service_area_notes,
  origin_latitude,
  origin_longitude,
  destination_latitude,
  destination_longitude,
  created_at,
  booking_trips (
    sort_order,
    trips (
      id,
      service_type,
      status,
      chauffeur_id,
      vehicle_id
    )
  )
`

export type AccountPortalBookingDetailRow = {
	id: string
	payment_reference: string | null
	status: string | null
	payment_status: string | null
	booking_intent: string | null
	customer_account_id: string | null
	client_type: string | null
	pickup_datetime: string | null
	origin_name: string | null
	destination_name: string | null
	total_amount: number | null
	passenger_count: number | null
	rider_name: string | null
	rider_email: string | null
	rider_phone: string | null
	current_quote_id: string | null
	flight_number: string | null
	hourly_service_area_notes: string | null
	origin_latitude: number | null
	origin_longitude: number | null
	destination_latitude: number | null
	destination_longitude: number | null
	created_at: string
	booking_trips: unknown
}

type TripEmbed = {
	sort_order?: number | null
	trips?:
		| { id?: string; service_type?: string | null }
		| { id?: string; service_type?: string | null }[]
		| null
}

function normalizeBookingTrips(raw: unknown): TripEmbed[] {
	if (!raw) return []
	if (Array.isArray(raw)) return raw as TripEmbed[]
	return [raw as TripEmbed]
}

/** First trip’s `service_type` (portal cannot read `vehicles` — same as 15A.3 list). */
export function extractTripServiceTypeForDetail(booking_trips: unknown): string | null {
	const rows = normalizeBookingTrips(booking_trips)
	const sorted = [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
	const embed = sorted[0]?.trips
	const trip = Array.isArray(embed) ? embed[0] : embed
	const st = trip?.service_type
	return typeof st === 'string' && st.trim() !== '' ? st : null
}

export async function loadAccountPortalBookingDetail(
	supabase: SupabaseClient,
	bookingId: string,
	activeAccountId: string,
): Promise<{ booking: AccountPortalBookingDetailRow; quote: OpsBookingQuoteDetailRow | null } | null> {
	const { data: booking, error } = await supabase
		.from('bookings')
		.select(ACCOUNT_PORTAL_BOOKING_DETAIL_SELECT)
		.eq('id', bookingId)
		.eq('customer_account_id', activeAccountId)
		.eq('client_type', 'account_client')
		.maybeSingle()

	if (error || !booking) return null

	const b = booking as AccountPortalBookingDetailRow

	let quote: OpsBookingQuoteDetailRow | null = null
	try {
		quote = await loadResolvedBookingQuoteForOps(supabase, b.id, b.current_quote_id)
	} catch {
		quote = null
	}

	return { booking: b, quote }
}
