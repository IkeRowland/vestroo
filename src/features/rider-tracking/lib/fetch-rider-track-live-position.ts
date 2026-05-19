import type { SupabaseClient } from '@supabase/supabase-js'

import { resolveChauffeurAssignmentIdForTrip } from '@/lib/resolve-chauffeur-assignment'

/** Narrow DTO for public `/track` — no POPIA widening beyond map needs; do not log raw coords at info. */
export type RiderTrackLivePositionDto = {
	lat: number
	lng: number
	updatedAtIso: string
}

type CurrentLocationJson = {
	lat?: number
	lng?: number
}

/**
 * Latest chauffeur position for a verified track token path.
 * Uses the same Supabase client as `loadPublicRiderTrackView` (service role on server — not anon JWT).
 * Call only after `verifyRiderTrackToken` and only when {@link shouldFetchRiderTrackLivePosition} is true.
 */
export async function fetchLatestRiderTrackLivePosition(
	supabase: SupabaseClient,
	trip: {
		id: string
		chauffeur_id: string | null
		vehicle_id: string | null
	},
): Promise<RiderTrackLivePositionDto | null> {
	const chauffeurId = trip.chauffeur_id
	const vehicleId = trip.vehicle_id
	if (!chauffeurId || !vehicleId) return null

	const assignmentId = await resolveChauffeurAssignmentIdForTrip(supabase, {
		tripId: trip.id,
	})
	if (!assignmentId) return null

	const { data: row, error } = await supabase
		.from('vehicle_trackings')
		.select('current_location, updated_at')
		.eq('chauffeur_assignment_id', assignmentId)
		.maybeSingle()

	if (error || !row) return null

	const loc = row.current_location as CurrentLocationJson | null
	const lat = typeof loc?.lat === 'number' ? loc.lat : Number(loc?.lat)
	const lng = typeof loc?.lng === 'number' ? loc.lng : Number(loc?.lng)
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

	const updatedAtIso = String(row.updated_at ?? '')
	if (!updatedAtIso) return null

	return { lat, lng, updatedAtIso }
}
