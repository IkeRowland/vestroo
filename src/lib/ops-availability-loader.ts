import type { SupabaseClient } from '@supabase/supabase-js'

import {
	availabilityWindowFromBooking,
	type AvailabilityWindow,
} from '@/lib/ops-availability-window'
import type { AvailabilityRouteScope } from '@/actions/opsAvailabilityCheck'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

/**
 * Epic 16 / Theme B / **US-B2** — server-side loader that powers the **`AvailabilityCheckPanel`** on
 * **`/ops/bookings/[id]/availability`**. All queries
 * are batched once with the candidate id list (no N+1 per row).
 */

export type AvailabilityBookingSummary = {
	id: string
	clientType: AvailabilityRouteScope
	pickupDatetime: string | null
	estimatedDurationMin: number | null
	passengerCount: number
	customerName: string | null
	paymentReference: string | null
	originName: string | null
	destinationName: string | null
	availabilityCheckedAt: string | null
}

export type AvailabilityVehicleCandidate = {
	id: string
	name: string
	licensePlate: string | null
	categoryName: string | null
	categorySeats: number
}

export type AvailabilityDriverCandidate = {
	id: string
	displayName: string
	email: string | null
}

export type AvailabilityTripBlock = {
	id: string
	timeStart: string
	timeEnd: string
	status: string | null
	vehicleId: string | null
	driverId: string | null
	source: 'trip' | 'chauffeur_assignment'
}

export type AvailabilityLoaderResult =
	| {
		ok: true
		booking: AvailabilityBookingSummary
		window: AvailabilityWindow
		vehicles: AvailabilityVehicleCandidate[]
		drivers: AvailabilityDriverCandidate[]
		blocks: AvailabilityTripBlock[]
	}
	| { ok: false; reason: 'not_found' | 'forbidden' | 'missing_pickup' | 'database'; message: string }

type BookingLoadRow = {
	id: string
	client_type: string | null
	pickup_datetime: string | null
	estimated_duration: number | null
	passenger_count: number | null
	customer_name: string | null
	payment_reference: string | null
	origin_name: string | null
	destination_name: string | null
	availability_checked_at: string | null
}

type VehicleRow = {
	id: string
	name: string
	license_plate: string | null
	category_id: string | null
	vehicle_categories?: unknown
}

type ProfileRow = {
	id: string
	full_name?: string | null
	email?: string | null
}

type TripRow = {
	id: string
	vehicle_id: string | null
	chauffeur_id: string | null
	time_start_estimate: string
	time_end_estimate: string
	status: string | null
}

type ChauffeurAssignmentRow = {
	id: string
	chauffeur_id: string
	vehicle_id: string | null
	start_time: string
	end_time: string
	status: string | null
}

function categoryFromVehicleRow(row: VehicleRow): { name: string | null; seats: number } {
	const raw = row.vehicle_categories
	const obj = Array.isArray(raw) ? raw[0] : raw
	if (!obj || typeof obj !== 'object') {
		return { name: null, seats: 0 }
	}
	const o = obj as { name?: unknown; number_of_seat?: unknown }
	const name = typeof o.name === 'string' ? o.name : null
	const seatsRaw = typeof o.number_of_seat === 'number' ? o.number_of_seat : Number(o.number_of_seat)
	const seats = Number.isFinite(seatsRaw) ? Math.max(0, Math.floor(seatsRaw)) : 0
	return { name, seats }
}

function driverDisplayName(row: ProfileRow): string {
	const fn = (row.full_name ?? '').trim()
	if (fn !== '') return fn
	const email = (row.email ?? '').trim()
	if (email !== '') return email
	return row.id.slice(0, 8)
}

export async function loadAvailabilityCheckContext(
	supabase: SupabaseClient,
	bookingId: string,
	scope: AvailabilityRouteScope,
): Promise<AvailabilityLoaderResult> {
	const { data: bookingRaw, error: bErr } = await supabase
		.from('bookings')
		.select(
			'id, client_type, pickup_datetime, estimated_duration, passenger_count, customer_name, payment_reference, origin_name, destination_name, availability_checked_at',
		)
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr) {
		return { ok: false, reason: 'database', message: bErr.message }
	}
	if (!bookingRaw) {
		return { ok: false, reason: 'not_found', message: 'Booking not found' }
	}

	const booking = bookingRaw as unknown as BookingLoadRow
	if (booking.client_type !== scope) {
		return {
			ok: false,
			reason: 'forbidden',
			message: 'Booking does not belong to this workflow.',
		}
	}

	const window = availabilityWindowFromBooking({
		pickup_datetime: booking.pickup_datetime,
		estimated_duration: booking.estimated_duration,
	})
	if (!window) {
		return {
			ok: false,
			reason: 'missing_pickup',
			message: 'Booking has no pickup datetime — set a pickup before checking availability.',
		}
	}

	const passengerCountRaw = booking.passenger_count
	const passengerCount =
		typeof passengerCountRaw === 'number' && Number.isFinite(passengerCountRaw)
			? Math.max(1, Math.floor(passengerCountRaw))
			: 1

	const { data: vehicleRows, error: vErr } = await supabase
		.from('vehicles')
		.select('id, name, license_plate, category_id, vehicle_categories ( name, number_of_seat )')
		.order('name', { ascending: true })

	if (vErr) {
		return { ok: false, reason: 'database', message: vErr.message }
	}

	const vehicleCandidates: AvailabilityVehicleCandidate[] = []
	for (const raw of (vehicleRows ?? []) as VehicleRow[]) {
		const cat = categoryFromVehicleRow(raw)
		if (cat.seats < passengerCount) continue
		vehicleCandidates.push({
			id: raw.id,
			name: raw.name,
			licensePlate: raw.license_plate,
			categoryName: cat.name,
			categorySeats: cat.seats,
		})
	}

	const { data: driverRows, error: dErr } = await supabase
		.from('profiles')
		.select('id, full_name, email')
		.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)
		.eq('status', 'active')
		.order('full_name', { ascending: true })

	if (dErr) {
		return { ok: false, reason: 'database', message: dErr.message }
	}

	const drivers: AvailabilityDriverCandidate[] = ((driverRows ?? []) as ProfileRow[]).map((row) => ({
		id: row.id,
		displayName: driverDisplayName(row),
		email: row.email ?? null,
	}))

	const vehicleIds = vehicleCandidates.map((v) => v.id)
	const driverIds = drivers.map((d) => d.id)

	const tripsForVehicles =
		vehicleIds.length === 0
			? { data: [] as TripRow[], error: null }
			: await supabase
				.from('trips')
				.select('id, vehicle_id, chauffeur_id, time_start_estimate, time_end_estimate, status')
				.in('vehicle_id', vehicleIds)
				.lt('time_start_estimate', window.endIso)
				.gt('time_end_estimate', window.startIso)

	const tripsForDrivers =
		driverIds.length === 0
			? { data: [] as TripRow[], error: null }
			: await supabase
				.from('trips')
				.select('id, vehicle_id, chauffeur_id, time_start_estimate, time_end_estimate, status')
				.in('chauffeur_id', driverIds)
				.lt('time_start_estimate', window.endIso)
				.gt('time_end_estimate', window.startIso)

	const assignmentsForDrivers =
		driverIds.length === 0
			? { data: [] as ChauffeurAssignmentRow[], error: null }
			: await supabase
				.from('chauffeur_assignments')
				.select('id, chauffeur_id, vehicle_id, start_time, end_time, status')
				.in('chauffeur_id', driverIds)
				.lt('start_time', window.endIso)
				.gt('end_time', window.startIso)

	if (tripsForVehicles.error) {
		return { ok: false, reason: 'database', message: tripsForVehicles.error.message }
	}
	if (tripsForDrivers.error) {
		return { ok: false, reason: 'database', message: tripsForDrivers.error.message }
	}
	if (assignmentsForDrivers.error) {
		return { ok: false, reason: 'database', message: assignmentsForDrivers.error.message }
	}

	const blocks: AvailabilityTripBlock[] = []
	const seenTripIds = new Set<string>()
	for (const row of (tripsForVehicles.data ?? []) as TripRow[]) {
		seenTripIds.add(row.id)
		blocks.push({
			id: `trip:${row.id}`,
			timeStart: row.time_start_estimate,
			timeEnd: row.time_end_estimate,
			status: row.status,
			vehicleId: row.vehicle_id,
			driverId: row.chauffeur_id,
			source: 'trip',
		})
	}
	for (const row of (tripsForDrivers.data ?? []) as TripRow[]) {
		if (seenTripIds.has(row.id)) continue
		seenTripIds.add(row.id)
		blocks.push({
			id: `trip:${row.id}`,
			timeStart: row.time_start_estimate,
			timeEnd: row.time_end_estimate,
			status: row.status,
			vehicleId: row.vehicle_id,
			driverId: row.chauffeur_id,
			source: 'trip',
		})
	}
	for (const row of (assignmentsForDrivers.data ?? []) as ChauffeurAssignmentRow[]) {
		blocks.push({
			id: `chauffeur_assignment:${row.id}`,
			timeStart: row.start_time,
			timeEnd: row.end_time,
			status: row.status,
			vehicleId: row.vehicle_id,
			driverId: row.chauffeur_id,
			source: 'chauffeur_assignment',
		})
	}

	return {
		ok: true,
		booking: {
			id: booking.id,
			clientType: scope,
			pickupDatetime: booking.pickup_datetime,
			estimatedDurationMin: booking.estimated_duration,
			passengerCount,
			customerName: booking.customer_name,
			paymentReference: booking.payment_reference,
			originName: booking.origin_name,
			destinationName: booking.destination_name,
			availabilityCheckedAt: booking.availability_checked_at,
		},
		window,
		vehicles: vehicleCandidates,
		drivers,
		blocks,
	}
}
