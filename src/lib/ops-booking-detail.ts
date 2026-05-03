import type { SupabaseClient } from '@supabase/supabase-js'

import { extractTripServiceTypeForDetail } from '@/lib/account-booking-detail'

/** Ops booking detail — full read-only snapshot for `/ops/bookings/[id]`. */
export const OPS_BOOKING_DETAIL_SELECT = `
  id,
  payment_reference,
  status,
  payment_status,
  booking_intent,
  client_type,
  customer_account_id,
  customer_name,
  customer_email,
  pickup_datetime,
  origin_name,
  destination_name,
  total_amount,
  availability_checked_at,
  passenger_count,
  rider_name,
  rider_email,
  rider_phone,
  current_quote_id,
  created_at,
  customer_accounts ( id, name ),
  booking_trips (
    sort_order,
    trips (
      id,
      service_type,
      vehicles (
        name,
        vehicle_categories ( name )
      )
    )
  )
`

export type OpsBookingDetailRow = {
	id: string
	payment_reference: string | null
	status: string | null
	payment_status: string | null
	booking_intent: string | null
	client_type: string | null
	customer_account_id: string | null
	customer_name: string | null
	customer_email: string | null
	pickup_datetime: string | null
	origin_name: string | null
	destination_name: string | null
	total_amount: number | null
	availability_checked_at: string | null
	passenger_count: number | null
	rider_name: string | null
	rider_email: string | null
	rider_phone: string | null
	current_quote_id: string | null
	created_at: string
	customer_accounts?: unknown
	booking_trips: unknown
}

type TripLink = { sort_order: number | null; trips: unknown }
type TripNested = { vehicles?: unknown; service_type?: string | null }
type VehicleNested = { name?: string | null; vehicle_categories?: unknown }

function asArray<T>(v: T | T[] | null | undefined): T[] {
	if (v == null) return []
	return Array.isArray(v) ? v : [v]
}

function firstTripFromBookingTrips(booking_trips: unknown): TripNested | null {
	const links = asArray<TripLink>(booking_trips as TripLink[] | TripLink | null)
	if (links.length === 0) return null
	const sorted = [...links].sort((a, b) => {
		const sa = typeof a.sort_order === 'number' ? a.sort_order : 0
		const sb = typeof b.sort_order === 'number' ? b.sort_order : 0
		return sa - sb
	})
	for (const link of sorted) {
		const t = link.trips
		const trip = Array.isArray(t) ? t[0] : t
		if (trip && typeof trip === 'object') {
			return trip as TripNested
		}
	}
	return null
}

/** Vehicle name from first linked trip (queue-style). */
export function extractOpsBookingVehicleName(booking_trips: unknown): string | null {
	const trip = firstTripFromBookingTrips(booking_trips)
	if (!trip) return null
	const rawV = trip.vehicles
	const veh = Array.isArray(rawV) ? rawV[0] : rawV
	if (!veh || typeof veh !== 'object') return null
	const name = (veh as { name?: string | null }).name
	return typeof name === 'string' && name.trim() !== '' ? name.trim() : null
}

/** Vehicle category label from first linked trip (walk-in quote email parity). */
export function extractOpsBookingVehicleCategoryName(booking_trips: unknown): string | null {
	const trip = firstTripFromBookingTrips(booking_trips)
	if (!trip) return null
	const vRaw = trip.vehicles
	const v = Array.isArray(vRaw) ? vRaw[0] : vRaw
	if (!v || typeof v !== 'object') return null
	const cRaw = (v as VehicleNested).vehicle_categories
	const c = Array.isArray(cRaw) ? cRaw[0] : cRaw
	if (!c || typeof c !== 'object') return null
	const n = (c as { name?: string | null }).name
	return typeof n === 'string' && n.trim() !== '' ? n.trim() : null
}

export function linkedAccountNameFromOpsBooking(row: OpsBookingDetailRow): string | null {
	const ca = row.customer_accounts as unknown
	if (!ca) {
		return null
	}
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

export function defaultWalkInQuoteLineLabel(
	booking: Pick<OpsBookingDetailRow, 'origin_name' | 'destination_name'>,
): string {
	const o = (booking.origin_name ?? '').trim() || 'Pickup'
	const d = (booking.destination_name ?? '').trim() || 'Drop-off'
	return `${o} → ${d}`
}

export async function loadOpsBookingDetail(
	supabase: SupabaseClient,
	bookingId: string,
): Promise<OpsBookingDetailRow | null> {
	const { data, error } = await supabase
		.from('bookings')
		.select(OPS_BOOKING_DETAIL_SELECT)
		.eq('id', bookingId)
		.maybeSingle()

	if (error || !data || typeof data !== 'object' || !('id' in data)) {
		return null
	}
	return data as OpsBookingDetailRow
}

export function opsBookingServiceTypeLabel(booking: OpsBookingDetailRow): string | null {
	return extractTripServiceTypeForDetail(booking.booking_trips)
}
