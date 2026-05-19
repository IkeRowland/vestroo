import type { SupabaseClient } from '@supabase/supabase-js'

type TripAssignmentLookup = {
	/** Trip row id — matches `chauffeur_assignments.trip_id` (charter dispatch). */
	tripId: string
}

/**
 * Resolve the `chauffeur_assignments` row for live tracking / `vehicle_trackings`.
 */
export async function resolveChauffeurAssignmentIdForTrip(
	supabase: SupabaseClient,
	trip: TripAssignmentLookup,
): Promise<string | null> {
	const { data: byTrip, error: tripErr } = await supabase
		.from('chauffeur_assignments')
		.select('id')
		.eq('trip_id', trip.tripId)
		.maybeSingle()

	if (!tripErr && byTrip?.id) {
		return String(byTrip.id)
	}

	return null
}
