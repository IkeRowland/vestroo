import { cache } from 'react'

import { createServerClient } from '@/lib/supabase/server'
import { verifyRiderTrackToken } from '@/lib/tracking-tokens'

import {
	fetchLatestRiderTrackLivePosition,
	type RiderTrackLivePositionDto,
} from './fetch-rider-track-live-position'
import { buildPublicRiderTrackDto, type PublicRiderTrackDto } from './public-rider-track-dto'
import { isRiderLiveLocationEnvEnabled } from './rider-live-location-env'
import { shouldFetchRiderTrackLivePosition } from './rider-live-location-gate'

export type LoadPublicRiderTrackResult =
	| { ok: true; data: PublicRiderTrackDto }
	| { ok: false; gate: 'token_invalid' }

/**
 * Token-first gate (Epic 15 / 15B.3): no trip/chauffeur/vehicle fetch unless **`verifyRiderTrackToken`** succeeds.
 * Missing trips after a valid token return the same **`token_invalid`** surface (no existence oracle).
 *
 * **15B.5:** Uses **`createServerClient`** (`SUPABASE_SERVICE_ROLE_KEY` — server-only, not the anon JWT).
 * Latest coords come from **`vehicle_trackings`** only on the valid-token path, as a narrow DTO — never
 * a browser **`subscribeVehicleTrackings`** subscription (Realtime is RLS + user JWT; unsuitable for `/track`).
 */
export async function loadPublicRiderTrackView(rawToken: string): Promise<LoadPublicRiderTrackResult> {
	const verified = verifyRiderTrackToken(rawToken.trim(), { expectedPurpose: 'rider_track' })
	if (!verified.valid) {
		return { ok: false, gate: 'token_invalid' }
	}

	const tripId = verified.payload.trip_id
	const supabase = await createServerClient()

	const { data: trip, error: tripErr } = await supabase
		.from('trips')
		.select(
			'id, status, time_start_estimate, time_end_estimate, created_at, chauffeur_id, vehicle_id, service_run_id, service_type',
		)
		.eq('id', tripId)
		.maybeSingle()

	if (tripErr || !trip) {
		return { ok: false, gate: 'token_invalid' }
	}

	const tripStatusRaw = String(trip.status ?? 'booking')

	let accountLiveRiderTracking = false
	const { data: bookingTrip } = await supabase
		.from('booking_trips')
		.select('booking_id')
		.eq('trip_id', tripId)
		.maybeSingle()

	const bookingId = bookingTrip?.booking_id as string | undefined
	if (bookingId) {
		const { data: booking } = await supabase
			.from('bookings')
			.select('customer_account_id')
			.eq('id', bookingId)
			.maybeSingle()
		const caId = booking?.customer_account_id as string | null | undefined
		if (caId) {
			const { data: ca } = await supabase
				.from('customer_accounts')
				.select('live_rider_tracking')
				.eq('id', caId)
				.maybeSingle()
			accountLiveRiderTracking = Boolean(ca?.live_rider_tracking)
		}
	}

	const envOn = isRiderLiveLocationEnvEnabled()
	const fetchLive = shouldFetchRiderTrackLivePosition({
		envEnabled: envOn,
		accountLiveRiderTracking,
		tripStatusRaw,
	})

	let livePosition: RiderTrackLivePositionDto | null = null
	if (fetchLive) {
		livePosition = await fetchLatestRiderTrackLivePosition(supabase, {
			chauffeur_id: trip.chauffeur_id as string | null,
			vehicle_id: trip.vehicle_id as string | null,
			service_run_id: (trip.service_run_id as string | null) ?? null,
		})
	}

	const vehicleId = trip.vehicle_id as string | null
	const driverProfileId = trip.chauffeur_id as string | null

	const vehiclePromise =
		vehicleId != null
			? supabase
					.from('vehicles')
					.select('name, license_plate')
					.eq('id', vehicleId)
					.maybeSingle()
			: Promise.resolve({ data: null as null })

	const driverProfilePromise =
		driverProfileId != null
			? supabase
					.from('profiles')
					.select('full_name, phone, avatar_url')
					.eq('id', driverProfileId)
					.maybeSingle()
			: Promise.resolve({ data: null as null })

	const [{ data: vehicle }, { data: driverProfile }] = await Promise.all([
		vehiclePromise,
		driverProfilePromise,
	])

	const dto = buildPublicRiderTrackDto({
		status: tripStatusRaw,
		serviceType: (trip.service_type as string | null) ?? null,
		createdAtIso: String(trip.created_at),
		timeStartEstimateIso: (trip.time_start_estimate as string | null) ?? null,
		timeEndEstimateIso: (trip.time_end_estimate as string | null) ?? null,
		vehicleName: (vehicle?.name as string | null) ?? null,
		licensePlate: (vehicle?.license_plate as string | null) ?? null,
		driverFullName: (driverProfile?.full_name as string | null) ?? null,
		driverPhone: (driverProfile?.phone as string | null) ?? null,
		driverAvatarUrl: (driverProfile?.avatar_url as string | null) ?? null,
		livePosition,
	})

	return { ok: true, data: dto }
}

/**
 * Per-request memo for **`loadPublicRiderTrackView`** so **`generateMetadata`** and the page body
 * share one load (Epic 15 / **15B.7** — `noindex` + invalid branch without double Supabase round-trips).
 */
export const loadPublicRiderTrackViewForRequest = cache((rawToken: string) =>
	loadPublicRiderTrackView(rawToken.trim()),
)
