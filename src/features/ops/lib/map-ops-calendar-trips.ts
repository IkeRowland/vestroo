import type { OpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { tripStatusDisplayLabel } from '@/features/ops/copy/ops-trips-copy'

/** FE.17.9 `events` item — `tone` matches **`OpsStatusPill`** / **`getOpsStatusPillTone`**. */
export type OpsCalendarWeekEvent = {
	id: string
	startsAt: string
	endsAt: string
	title: string
	subtitle: string
	tone: OpsStatusPillTone
	href?: string
}

export type OpsCalendarTripRailPayload = {
	tripId: string
	status: string
	scheduleLabel: string
	vehicleName: string
	clientLabel: string
	driverName: string
	notes: string | null
	serviceType: string | null
}

type NestedVehicle = { name: string | null } | null | { name: string | null }[]

type NestedBooking = {
	customer_name: string | null
	rider_name: string | null
	origin_name: string | null
	destination_name: string | null
} | null

type NestedBookingTrip = {
	bookings: NestedBooking | NestedBooking[] | null
} | null

export type OpsCalendarTripSourceRow = {
	id: string
	status: string | null
	time_start_estimate: string
	time_end_estimate: string
	vehicle_id: string
	chauffeur_id: string
	ops_delay_note: string | null
	service_type: string | null
	vehicles: NestedVehicle
	booking_trips: NestedBookingTrip[] | null
}

function vehicleNameFromRow(row: OpsCalendarTripSourceRow): string {
	const v = row.vehicles
	if (v == null) return '—'
	const one = Array.isArray(v) ? v[0] : v
	const n = one?.name?.trim()
	return n || '—'
}

function bookingFromRow(row: OpsCalendarTripSourceRow): NestedBooking {
	const bt = row.booking_trips
	if (!bt || bt.length === 0) return null
	const first = bt[0]?.bookings
	if (first == null) return null
	return Array.isArray(first) ? first[0] ?? null : first
}

function clientLine(row: OpsCalendarTripSourceRow): string {
	const b = bookingFromRow(row)
	if (!b) return '—'
	const o = (b.origin_name ?? '').trim()
	const dest = (b.destination_name ?? '').trim()
	if (o && dest) return `${o} → ${dest}`
	const cust = (b.customer_name ?? '').trim()
	if (cust) return cust
	const rider = (b.rider_name ?? '').trim()
	return rider || '—'
}

function eventTitle(row: OpsCalendarTripSourceRow): string {
	const line = clientLine(row)
	if (line !== '—') return line
	return `Trip ${String(row.id).slice(0, 8)}…`
}

function eventSubtitle(row: OpsCalendarTripSourceRow): string {
	const st = tripStatusDisplayLabel(String(row.status ?? ''))
	const vn = vehicleNameFromRow(row)
	return `${vn} · ${st}`
}

/**
 * Maps **`trips`** rows (nested **`vehicles`** / **`booking_trips`**) to **`OpsCalendarWeek`** **`events`**
 * plus rail payloads (**NFR.17.6** — no extra tables beyond this select).
 */
export function mapTripsToCalendarWeekData(
	rows: OpsCalendarTripSourceRow[],
	driverNameByProfileId: Readonly<Record<string, string>>,
): { events: OpsCalendarWeekEvent[]; railByTripId: Record<string, OpsCalendarTripRailPayload> } {
	const events: OpsCalendarWeekEvent[] = []
	const railByTripId: Record<string, OpsCalendarTripRailPayload> = {}

	for (const row of rows) {
		const id = row.id as string
		const status = String(row.status ?? '')
		const tone = getOpsStatusPillTone(status)
		events.push({
			id,
			startsAt: row.time_start_estimate,
			endsAt: row.time_end_estimate,
			title: eventTitle(row),
			subtitle: eventSubtitle(row),
			tone,
		})
		const driver =
			driverNameByProfileId[row.chauffeur_id]?.trim() || `${String(row.chauffeur_id).slice(0, 8)}…`
		railByTripId[id] = {
			tripId: id,
			status,
			scheduleLabel: `${new Date(row.time_start_estimate).toLocaleString()} → ${new Date(row.time_end_estimate).toLocaleString()}`,
			vehicleName: vehicleNameFromRow(row),
			clientLabel: clientLine(row),
			driverName: driver,
			notes: row.ops_delay_note?.trim() ? row.ops_delay_note : null,
			serviceType: row.service_type,
		}
	}

	events.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
	return { events, railByTripId }
}
