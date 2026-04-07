import type { SupabaseClient } from '@supabase/supabase-js'

type TripAssignmentLookup = {
	chauffeur_id: string
	vehicle_id: string
	service_run_id: string | null
}

/**
 * Resolve the `chauffeur_assignments` row created alongside dispatch for this trip (run + vehicle + chauffeur).
 */
export async function resolveChauffeurAssignmentIdForTrip(
	supabase: SupabaseClient,
	trip: TripAssignmentLookup,
): Promise<string | null> {
	if (!trip.service_run_id) {
		return null
	}

	const { data: run, error: runErr } = await supabase
		.from('service_runs')
		.select('service_route_id, trip_number')
		.eq('id', trip.service_run_id)
		.maybeSingle()

	if (runErr || !run) {
		return null
	}

	const { data: ca, error: caErr } = await supabase
		.from('chauffeur_assignments')
		.select('id')
		.eq('chauffeur_id', trip.chauffeur_id)
		.eq('vehicle_id', trip.vehicle_id)
		.eq('service_route_id', run.service_route_id as string)
		.eq('trip_number', run.trip_number as number)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (caErr || !ca) {
		return null
	}

	return String(ca.id)
}
