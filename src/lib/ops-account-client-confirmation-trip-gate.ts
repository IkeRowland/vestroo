import type { SupabaseClient } from '@supabase/supabase-js'

import {
	findChauffeurWindowConflicts,
	findVehicleWindowConflicts,
	tripTimeWindow,
} from '@/lib/ops-time-windows'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

const PICKUP_TRIP_START_MAX_SKEW_MS = 120_000

function pickupAlignedWithTripStart(pickupIso: string, tripStartIso: string): boolean {
	const a = Date.parse(pickupIso.trim())
	const b = Date.parse(tripStartIso.trim())
	if (Number.isNaN(a) || Number.isNaN(b)) return false
	return Math.abs(a - b) <= PICKUP_TRIP_START_MAX_SKEW_MS
}

export type AccountClientConfirmationTripGateResult =
	| { ok: true }
	| { ok: false; message: string }

/**
 * Validates the **linked trip** for **`confirmAccountClientBookingFromOps`** using the same
 * time-window + driver availability rules as **`assignBookingToRun`** (no parallel calendar system).
 */
export async function evaluateAccountClientConfirmationTripGate(
	supabase: SupabaseClient,
	bookingId: string,
): Promise<AccountClientConfirmationTripGateResult> {
	const { data: booking, error: bErr } = await supabase
		.from('bookings')
		.select('id, pickup_datetime, estimated_duration, client_type, status')
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr || !booking) {
		return { ok: false, message: 'Booking not found.' }
	}

	if ((booking.client_type as string | null) !== 'account_client') {
		return { ok: false, message: 'Only account client bookings use this confirmation path.' }
	}

	if ((booking.status as string | null) !== 'pending_confirmation') {
		return { ok: false, message: 'Booking is not awaiting confirmation from operations.' }
	}

	const pickupIso = String(booking.pickup_datetime ?? '').trim()
	if (!pickupIso) {
		return { ok: false, message: 'Booking must have a pickup date and time before confirmation.' }
	}

	const { data: link, error: linkErr } = await supabase
		.from('booking_trips')
		.select(
			`
			trip_id,
			trips (
				id,
				chauffeur_id,
				vehicle_id,
				time_start_estimate,
				time_end_estimate,
				status
			)
			`,
		)
		.eq('booking_id', bookingId)
		.maybeSingle()

	if (linkErr || !link?.trip_id) {
		return { ok: false, message: 'Assign a driver and trip before confirming this booking.' }
	}

	const embed = link.trips as
		| {
				id?: string
				chauffeur_id?: string | null
				vehicle_id?: string | null
				time_start_estimate?: string | null
				time_end_estimate?: string | null
				status?: string | null
		  }
		| {
				id?: string
				chauffeur_id?: string | null
				vehicle_id?: string | null
				time_start_estimate?: string | null
				time_end_estimate?: string | null
				status?: string | null
		  }[]
		| null

	const trip = Array.isArray(embed) ? embed[0] : embed
	if (!trip || typeof trip.id !== 'string') {
		return { ok: false, message: 'Linked trip could not be loaded.' }
	}

	const tripId = trip.id
	const chauffeurId = typeof trip.chauffeur_id === 'string' && trip.chauffeur_id.length > 0 ? trip.chauffeur_id : null
	const vehicleId = typeof trip.vehicle_id === 'string' && trip.vehicle_id.length > 0 ? trip.vehicle_id : null
	const tripStart = String(trip.time_start_estimate ?? '').trim()
	const tripEnd = String(trip.time_end_estimate ?? '').trim()
	const tripStatus = String(trip.status ?? '').trim().toLowerCase()

	if (!chauffeurId || !vehicleId) {
		return { ok: false, message: 'The linked trip must have both a driver and a vehicle assigned.' }
	}

	if (tripStatus === 'cancelled' || tripStatus === 'completed') {
		return { ok: false, message: 'The linked trip is not in a confirmable state. Replace the trip assignment first.' }
	}

	if (!tripStart || !tripEnd) {
		return { ok: false, message: 'The linked trip is missing scheduled start or end times.' }
	}

	if (!pickupAlignedWithTripStart(pickupIso, tripStart)) {
		return {
			ok: false,
			message:
				'The assigned trip’s pickup time does not match this booking’s pickup date and time. Re-assign the trip from the booking pickup window.',
		}
	}

	const { data: driverRow, error: dErr } = await supabase
		.from('profiles')
		.select('id, role, status')
		.eq('id', chauffeurId)
		.maybeSingle()

	if (dErr || !driverRow) {
		return { ok: false, message: 'Could not load the assigned driver profile.' }
	}

	if (driverRow.role !== PROFILE_ROLE_OPS_DRIVER_DB) {
		return { ok: false, message: 'The linked trip’s driver is not a valid chauffeur profile.' }
	}

	const driverStatusKey = String(driverRow.status ?? '')
		.trim()
		.toLowerCase()
	if (driverStatusKey === 'inactive' || driverStatusKey === 'unavailable') {
		return {
			ok: false,
			message: 'The assigned driver is marked unavailable. Assign an available driver before confirming.',
		}
	}

	const candidate = tripTimeWindow({
		time_start_estimate: tripStart,
		time_end_estimate: tripEnd,
	})

	const { data: vehicleTrips, error: vtErr } = await supabase
		.from('trips')
		.select('id, vehicle_id, time_start_estimate, time_end_estimate, status')
		.eq('vehicle_id', vehicleId)

	if (vtErr) {
		return { ok: false, message: vtErr.message }
	}

	const vehicleConflicts = findVehicleWindowConflicts(vehicleTrips ?? [], vehicleId, candidate, tripId)
	if (vehicleConflicts.length > 0) {
		return {
			ok: false,
			message: 'The assigned vehicle is no longer free for this booking’s pickup window. Choose another assignment.',
		}
	}

	const { data: driverTrips, error: ctErr } = await supabase
		.from('trips')
		.select('id, chauffeur_id, time_start_estimate, time_end_estimate, status')
		.eq('chauffeur_id', chauffeurId)

	if (ctErr) {
		return { ok: false, message: ctErr.message }
	}

	const driverConflicts = findChauffeurWindowConflicts(driverTrips ?? [], chauffeurId, candidate, tripId)
	if (driverConflicts.length > 0) {
		return {
			ok: false,
			message: 'The assigned driver is no longer free for this booking’s pickup window. Choose another assignment.',
		}
	}

	return { ok: true }
}
