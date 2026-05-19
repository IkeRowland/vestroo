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
  booking_metadata,
  customer_accounts ( id, name ),
  booking_trips (
    sort_order,
    trips (
      id,
      status,
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
	/** Trip-request funnel stores selected vehicle in `trip_request.slide2` before a `trips` row exists. */
	booking_metadata?: unknown
	customer_accounts?: unknown
	booking_trips: unknown
}

type TripLink = { sort_order: number | null; trips: unknown }
type TripNested = {
	vehicles?: unknown
	service_type?: string | null
	status?: string | null
}
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

/** First linked trip `status` (Epic fulfil / ops queue display when `bookings.status` lags). */
export function extractFirstLinkedTripStatus(booking_trips: unknown): string | null {
	const trip = firstTripFromBookingTrips(booking_trips)
	const s = trip && typeof trip === 'object' && 'status' in trip ? (trip as { status: unknown }).status : null
	return typeof s === 'string' && s.trim() !== '' ? s.trim() : null
}

const BOOKING_STATUS_TERMINAL_FOR_TRIP_TRUTH = new Set([
	'cancelled',
	'expired',
	'invoiced',
	'paid_invoice',
])

/**
 * When a linked trip is ahead of `bookings.status` (e.g. trip `completed` but booking still
 * `ready_to_assign`), ops UI should reflect trip state. Account **ready_to_invoice** is preserved.
 */
export function effectiveBookingStatusKeyForOps(
	bookingStatus: string | null,
	booking_trips: unknown,
): string | null {
	const b = (bookingStatus ?? '').trim()
	if (!b) return bookingStatus

	const tripStatus = extractFirstLinkedTripStatus(booking_trips)?.toLowerCase() ?? ''
	if (!tripStatus) return bookingStatus

	if (tripStatus === 'completed') {
		if (
			!BOOKING_STATUS_TERMINAL_FOR_TRIP_TRUTH.has(b) &&
			b !== 'completed' &&
			b !== 'ready_to_invoice'
		) {
			return 'completed'
		}
	}

	if (tripStatus === 'cancelled') {
		if (!BOOKING_STATUS_TERMINAL_FOR_TRIP_TRUTH.has(b)) {
			return 'cancelled'
		}
	}

	if (b === 'ready_to_assign') {
		if (tripStatus === 'en_route') return 'in_progress'
		if (tripStatus === 'assigned') return 'assigned'
	}

	return bookingStatus
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

/** Slide 2 vehicle selection persisted under `booking_metadata.trip_request` (FE.10.4). */
export function parseTripRequestSlide2FromBookingMetadata(meta: unknown): {
	name: string | null
	classification: string | null
} | null {
	if (!meta || typeof meta !== 'object') return null
	const tr = (meta as Record<string, unknown>).trip_request
	if (!tr || typeof tr !== 'object') return null
	const slide2 = (tr as Record<string, unknown>).slide2
	if (!slide2 || typeof slide2 !== 'object') return null
	const s = slide2 as Record<string, unknown>
	const name = typeof s.name === 'string' && s.name.trim() !== '' ? s.name.trim() : null
	const classification =
		typeof s.classification === 'string' && s.classification.trim() !== ''
			? s.classification.trim()
			: null
	if (!name && !classification) return null
	return { name, classification }
}

function formatServiceTypeForOpsDisplay(code: string): string {
	const t = code.trim()
	if (!t) return t
	return t
		.split('_')
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' ')
}

/** Prefer linked trip; otherwise trip-request metadata (no `booking_trips` row until assign). */
export function extractOpsBookingVehicleNameForDetail(
	row: Pick<OpsBookingDetailRow, 'booking_trips' | 'booking_metadata'>,
): string | null {
	return (
		extractOpsBookingVehicleName(row.booking_trips) ??
		parseTripRequestSlide2FromBookingMetadata(row.booking_metadata)?.name ??
		null
	)
}

/** Prefer fleet vehicle category from trip; otherwise Slide 2 classification. */
export function extractOpsBookingVehicleCategoryNameForDetail(
	row: Pick<OpsBookingDetailRow, 'booking_trips' | 'booking_metadata'>,
): string | null {
	return (
		extractOpsBookingVehicleCategoryName(row.booking_trips) ??
		parseTripRequestSlide2FromBookingMetadata(row.booking_metadata)?.classification ??
		null
	)
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

/**
 * Whether this booking has a **`booking_trips`** row (trip created and linked).
 * Prefer this over counting embedded `booking_trips` on `bookings` selects — nested
 * `trips` / `vehicles` RLS can strip children so the embed looks empty even when the
 * link row exists (ops assign just succeeded).
 */
export async function loadBookingLinkedTripId(
	supabase: SupabaseClient,
	bookingId: string,
): Promise<string | null> {
	const { data, error } = await supabase
		.from('booking_trips')
		.select('trip_id')
		.eq('booking_id', bookingId)
		.maybeSingle()

	if (error || !data || typeof data !== 'object') return null
	const raw = (data as { trip_id?: unknown }).trip_id
	const tid = typeof raw === 'string' ? raw.trim() : ''
	return tid.length > 0 ? tid : null
}

/** Driver + vehicle for the trip linked to a booking (flat queries — reliable under nested-embed RLS gaps). */
export type OpsBookingTripAssignmentSummary = {
	tripId: string
	tripStatus: string | null
	timeStartEstimate: string | null
	timeEndEstimate: string | null
	driverFullName: string | null
	vehicleName: string | null
}

export async function loadOpsBookingTripAssignmentSummary(
	supabase: SupabaseClient,
	bookingId: string,
): Promise<OpsBookingTripAssignmentSummary | null> {
	const tripId = await loadBookingLinkedTripId(supabase, bookingId)
	if (!tripId) return null

	const { data: trip, error: tErr } = await supabase
		.from('trips')
		.select('id, status, time_start_estimate, time_end_estimate, chauffeur_id, vehicle_id')
		.eq('id', tripId)
		.maybeSingle()

	if (tErr || !trip || typeof trip !== 'object') return null

	const chauffeurId =
		typeof (trip as { chauffeur_id?: unknown }).chauffeur_id === 'string'
			? (trip as { chauffeur_id: string }).chauffeur_id.trim()
			: ''
	const vehicleId =
		typeof (trip as { vehicle_id?: unknown }).vehicle_id === 'string'
			? (trip as { vehicle_id: string }).vehicle_id.trim()
			: ''

	const [profRes, vehRes] = await Promise.all([
		chauffeurId
			? supabase.from('profiles').select('full_name').eq('id', chauffeurId).maybeSingle()
			: Promise.resolve({ data: null as { full_name?: string | null } | null }),
		vehicleId
			? supabase.from('vehicles').select('name').eq('id', vehicleId).maybeSingle()
			: Promise.resolve({ data: null as { name?: string | null } | null }),
	])

	const driverFullName =
		profRes.data && typeof profRes.data.full_name === 'string'
			? profRes.data.full_name.trim() || null
			: null
	const vehicleName =
		vehRes.data && typeof vehRes.data.name === 'string'
			? vehRes.data.name.trim() || null
			: null

	const ts = (trip as { time_start_estimate?: unknown }).time_start_estimate
	const te = (trip as { time_end_estimate?: unknown }).time_end_estimate
	const st = (trip as { status?: unknown }).status

	return {
		tripId,
		tripStatus: typeof st === 'string' && st.trim() !== '' ? st.trim() : null,
		timeStartEstimate: typeof ts === 'string' && ts.trim() !== '' ? ts.trim() : null,
		timeEndEstimate: typeof te === 'string' && te.trim() !== '' ? te.trim() : null,
		driverFullName,
		vehicleName,
	}
}

export function opsBookingServiceTypeLabel(booking: OpsBookingDetailRow): string | null {
	const fromTrip = extractTripServiceTypeForDetail(booking.booking_trips)
	if (fromTrip) {
		return formatServiceTypeForOpsDisplay(fromTrip)
	}
	/** Trip-request bookings only get a `trips` row after assignment; fulfil uses `charter`. */
	if ((booking.booking_intent ?? '').trim() === 'trip_request') {
		return 'Charter'
	}
	return null
}
