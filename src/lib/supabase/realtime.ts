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

export type ServiceRunRealtimeRow = {
	id: string
	service_route_id: string
	service_date: string
	scheduled_start: string
	scheduled_end: string
	trip_number: number
	updated_at: string
}

/** Spec for ops bookings queue — INSERT + UPDATE only (no DELETE listener). */
export function bookingsOpsRealtimeSubscriptionSpec(): {
	channelName: string
	schema: typeof REALTIME_SCHEMA
	table: 'bookings'
	events: readonly ('INSERT' | 'UPDATE')[]
} {
	return {
		channelName: 'bookings_ops_queue_changes',
		schema: REALTIME_SCHEMA,
		table: 'bookings',
		events: ['INSERT', 'UPDATE'] as const,
	}
}

export type ChauffeurAssignmentRealtimeRow = {
	id: string
	chauffeur_id: string
	service_route_id: string
	vehicle_id: string
	start_time: string
	end_time: string
	trip_number: number
	status: string
	updated_at: string
}

/** Spec for tests and narrow channel naming (SH.9.4). */
export function serviceRunsRealtimeSubscriptionSpec(options?: {
	serviceRunId?: string
}): {
	channelName: string
	filter: string | undefined
	schema: typeof REALTIME_SCHEMA
	table: 'service_runs'
	event: '*'
} {
	const runId = options?.serviceRunId
	const filter = runId ? `id=eq.${runId}` : undefined
	const channelName = runId ? `service_runs_changes:${runId}` : 'service_runs_changes'
	return {
		channelName,
		filter,
		schema: REALTIME_SCHEMA,
		table: 'service_runs',
		event: '*',
	}
}

/** Spec for tests — optional `chauffeur_id` filter for field-scoped subscriptions. */
export function chauffeurAssignmentsRealtimeSubscriptionSpec(options?: {
	chauffeurId?: string
}): {
	channelName: string
	filter: string | undefined
	schema: typeof REALTIME_SCHEMA
	table: 'chauffeur_assignments'
	event: '*'
} {
	const chauffeurId = options?.chauffeurId
	const filter = chauffeurId ? `chauffeur_id=eq.${chauffeurId}` : undefined
	const channelName = chauffeurId
		? `chauffeur_assignments_changes:${chauffeurId}`
		: 'chauffeur_assignments_changes'
	return {
		channelName,
		filter,
		schema: REALTIME_SCHEMA,
		table: 'chauffeur_assignments',
		event: '*',
	}
}

/**
 * Subscribe to inserts/updates on `vehicle_trackings` (RLS filters rows per JWT).
 *
 * **Not suitable for anonymous public `/track/[token]` (Epic 15 / 15B.5):** Realtime uses the
 * browser Supabase client with the **anon** key; `postgres_changes` on `vehicle_trackings` is
 * governed by **RLS** tied to `auth.uid()` / chauffeur policies. Anonymous riders have no JWT row
 * access to live coords. Defence in depth is **server-side** fetch after `verifyRiderTrackToken`
 * (service-role or token-scoped RPC), returning a **narrow DTO** only on the valid-token path —
 * not a broad anon subscription. A future hardened pattern would need explicit channel auth, not
 * widening `vehicle_trackings` SELECT for `anon`.
 */
export function subscribeVehicleTrackings(
	supabase: SupabaseClient,
	handlers: {
		onPayload: () => void
		/** `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`, etc. */
		onSubscribeStatus?: (status: string, err?: Error) => void
	},
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
		.subscribe((status, err) => {
			handlers.onSubscribeStatus?.(status, err)
		})
}

/**
 * Subscribe to trip row changes for ops board refresh (staff JWT sees permitted trips).
 */
export function subscribeTripsBoard(
	supabase: SupabaseClient,
	handlers: {
		onPayload: () => void
		onSubscribeStatus?: (status: string, err?: Error) => void
	},
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
		.subscribe((status, err) => {
			handlers.onSubscribeStatus?.(status, err)
		})
}

/**
 * Subscribe to **`INSERT`** and **`UPDATE`** on `bookings` for `/ops/bookings` refresh.
 * RLS filters rows per staff JWT (**Epic 11 E1**).
 */
export function subscribeBookingsOps(
	supabase: SupabaseClient,
	handlers: {
		onPayload: () => void
		onSubscribeStatus?: (status: string, err?: Error) => void
	},
): RealtimeChannel {
	const spec = bookingsOpsRealtimeSubscriptionSpec()
	return supabase
		.channel(spec.channelName)
		.on(
			'postgres_changes',
			{ event: 'INSERT', schema: spec.schema, table: spec.table },
			() => {
				handlers.onPayload()
			},
		)
		.on(
			'postgres_changes',
			{ event: 'UPDATE', schema: spec.schema, table: spec.table },
			() => {
				handlers.onPayload()
			},
		)
		.subscribe((status, err) => {
			handlers.onSubscribeStatus?.(status, err)
		})
}

/**
 * Subscribe to `service_runs` (patterned run metadata). RLS: staff, chauffeur/trip party, ticket/booking party.
 * Optional `serviceRunId` adds a `postgres_changes` filter to cut churn when scoped to one run.
 */
export function subscribeServiceRuns(
	supabase: SupabaseClient,
	handlers: {
		onPayload: () => void
		onSubscribeStatus?: (status: string, err?: Error) => void
	},
	options?: { serviceRunId?: string },
): RealtimeChannel {
	const spec = serviceRunsRealtimeSubscriptionSpec(options)
	const payload =
		spec.filter !== undefined
			? {
					event: '*' as const,
					schema: spec.schema,
					table: spec.table,
					filter: spec.filter,
				}
			: {
					event: '*' as const,
					schema: spec.schema,
					table: spec.table,
				}
	return supabase
		.channel(spec.channelName)
		.on('postgres_changes', payload, () => {
			handlers.onPayload()
		})
		.subscribe((status, err) => {
			handlers.onSubscribeStatus?.(status, err)
		})
}

/**
 * Subscribe to `chauffeur_assignments` (chauffeur ↔ route window rows). RLS scopes to own chauffeur or staff.
 * Pass `chauffeurId` (usually `session user id`) to narrow Realtime filter; RLS still applies.
 */
export function subscribeChauffeurAssignments(
	supabase: SupabaseClient,
	handlers: {
		onPayload: () => void
		onSubscribeStatus?: (status: string, err?: Error) => void
	},
	options?: { chauffeurId?: string },
): RealtimeChannel {
	const spec = chauffeurAssignmentsRealtimeSubscriptionSpec(options)
	const payload =
		spec.filter !== undefined
			? {
					event: '*' as const,
					schema: spec.schema,
					table: spec.table,
					filter: spec.filter,
				}
			: {
					event: '*' as const,
					schema: spec.schema,
					table: spec.table,
				}
	return supabase
		.channel(spec.channelName)
		.on('postgres_changes', payload, () => {
			handlers.onPayload()
		})
		.subscribe((status, err) => {
			handlers.onSubscribeStatus?.(status, err)
		})
}

export function removeRealtimeChannel(
	supabase: SupabaseClient,
	channel: RealtimeChannel,
): void {
	void supabase.removeChannel(channel)
}
