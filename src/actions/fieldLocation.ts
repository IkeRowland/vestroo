'use server'

import { z } from 'zod'

import { getChauffeurForAction } from '@/lib/field-auth'
import {
	DEFAULT_ROAD_SPEED_KMH,
	estimateTravelMinutesHaversine,
} from '@/lib/maps'
import { resolveChauffeurAssignmentIdForTrip } from '@/lib/resolve-chauffeur-assignment'
import { isVehicleTrackingThrottled } from '@/lib/vehicle-tracking-throttle'
import { createUserServerClient } from '@/lib/supabase/server'

const publishSchema = z.object({
	tripId: z.string().uuid(),
	latitude: z.number().gte(-90).lte(90),
	longitude: z.number().gte(-180).lte(180),
	accuracyM: z.number().nonnegative().optional(),
})

type CurrentLocationJson = {
	lat: number
	lng: number
	accuracy_m?: number
	recorded_at: string
}

async function loadBookingDestination(
	supabase: Awaited<ReturnType<typeof createUserServerClient>>,
	tripId: string,
): Promise<{ lat: number; lng: number } | null> {
	const { data: link } = await supabase
		.from('booking_trips')
		.select('booking_id')
		.eq('trip_id', tripId)
		.maybeSingle()
	if (!link?.booking_id) {
		return null
	}
	const { data: booking } = await supabase
		.from('bookings')
		.select('destination_latitude, destination_longitude')
		.eq('id', link.booking_id as string)
		.maybeSingle()
	if (!booking) {
		return null
	}
	const lat = booking.destination_latitude as number | null
	const lng = booking.destination_longitude as number | null
	if (lat == null || lng == null) {
		return null
	}
	return { lat, lng }
}

/**
 * Chauffeur JWT: upsert `vehicle_trackings` for the active assignment; server throttle
 * {@link VEHICLE_TRACKING_MIN_INTERVAL_MS} between writes (12/min cap).
 */
export async function publishChauffeurLocationAction(raw: z.infer<typeof publishSchema>) {
	const parsed = publishSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getChauffeurForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
	}

	const supabase = await createUserServerClient()
	const { tripId, latitude, longitude, accuracyM } = parsed.data

	const { data: trip, error: tErr } = await supabase
		.from('trips')
		.select('id, chauffeur_id, vehicle_id, service_run_id')
		.eq('id', tripId)
		.maybeSingle()

	if (tErr || !trip) {
		return { ok: false as const, message: 'Trip not found' }
	}
	if ((trip.chauffeur_id as string) !== gate.session.userId) {
		return { ok: false as const, message: 'Forbidden' }
	}

	const assignmentId = await resolveChauffeurAssignmentIdForTrip(supabase, {
		chauffeur_id: trip.chauffeur_id as string,
		vehicle_id: trip.vehicle_id as string,
		service_run_id: (trip.service_run_id as string | null) ?? null,
	})

	if (!assignmentId) {
		return {
			ok: false as const,
			message: 'Live tracking requires a dispatched run link on this trip',
		}
	}

	const nowMs = Date.now()
	const recordedAt = new Date(nowMs).toISOString()

	const { data: existing, error: exErr } = await supabase
		.from('vehicle_trackings')
		.select('id, updated_at')
		.eq('chauffeur_assignment_id', assignmentId)
		.maybeSingle()

	if (exErr) {
		return { ok: false as const, message: exErr.message }
	}

	if (isVehicleTrackingThrottled(existing?.updated_at as string | undefined, nowMs)) {
		return {
			ok: false as const,
			message: 'Location update rate limited',
			throttled: true as const,
		}
	}

	const dest = await loadBookingDestination(supabase, tripId)
	let estimatedArrival: string | null = null
	if (dest) {
		const minutes = estimateTravelMinutesHaversine(
			{ lat: latitude, lng: longitude },
			dest,
			DEFAULT_ROAD_SPEED_KMH,
		)
		estimatedArrival = new Date(nowMs + minutes * 60_000).toISOString()
	}

	const currentLocation: CurrentLocationJson = {
		lat: latitude,
		lng: longitude,
		recorded_at: recordedAt,
	}
	if (accuracyM !== undefined) {
		currentLocation.accuracy_m = accuracyM
	}

	const serviceRunId = trip.service_run_id as string
	const vehicleId = trip.vehicle_id as string

	const row = {
		chauffeur_assignment_id: assignmentId,
		service_run_id: serviceRunId,
		vehicle_id: vehicleId,
		current_location: currentLocation,
		estimated_arrival: estimatedArrival,
		is_active: true,
	}

	if (existing?.id) {
		const { error: uErr } = await supabase
			.from('vehicle_trackings')
			.update({
				current_location: row.current_location,
				estimated_arrival: row.estimated_arrival,
				is_active: true,
			})
			.eq('id', existing.id as string)

		if (uErr) {
			return { ok: false as const, message: uErr.message }
		}
		return { ok: true as const }
	}

	const { error: iErr } = await supabase.from('vehicle_trackings').insert({
		...row,
		location_history: [],
		delay_time: 0,
	})

	if (iErr) {
		return { ok: false as const, message: iErr.message }
	}

	return { ok: true as const }
}
