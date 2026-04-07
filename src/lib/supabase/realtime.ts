import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

export const REALTIME_SCHEMA = 'public' as const

export type VehicleTrackingRealtimeRow = {
	id: string
	chauffeur_assignment_id: string
	service_run_id: string
	vehicle_id: string
	current_location: unknown
	estimated_arrival: string | null
	updated_at: string
}

export type TripRealtimeRow = {
	id: string
	status: string
	updated_at: string
	time_start_estimate: string
	time_end_estimate: string
}

/**
 * Subscribe to inserts/updates on `vehicle_trackings` (RLS filters rows per JWT).
 */
export function subscribeVehicleTrackings(
	supabase: SupabaseClient,
	handlers: { onPayload: () => void },
): RealtimeChannel {
	return supabase
		.channel('vehicle_trackings_changes')
		.on(
			'postgres_changes',
			{ event: '*', schema: REALTIME_SCHEMA, table: 'vehicle_trackings' },
			() => {
				handlers.onPayload()
			},
		)
		.subscribe()
}

/**
 * Subscribe to trip row changes for ops board refresh (staff JWT sees permitted trips).
 */
export function subscribeTripsBoard(
	supabase: SupabaseClient,
	handlers: { onPayload: () => void },
): RealtimeChannel {
	return supabase
		.channel('trips_board_changes')
		.on(
			'postgres_changes',
			{ event: '*', schema: REALTIME_SCHEMA, table: 'trips' },
			() => {
				handlers.onPayload()
			},
		)
		.subscribe()
}

export function removeRealtimeChannel(
	supabase: SupabaseClient,
	channel: RealtimeChannel,
): void {
	void supabase.removeChannel(channel)
}
