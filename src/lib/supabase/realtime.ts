import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

export const REALTIME_SCHEMA = 'public' as const

export type VehicleTrackingRealtimeRow = {
	id: string
	chauffeur_assignment_id: string
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

/** Spec for `/ops/bookings` live queue — bookings, trip rows, and booking↔trip links. */
export function bookingsQueueLiveRealtimeSubscriptionSpec(): {
	channelName: string
	schema: typeof REALTIME_SCHEMA
	sources: readonly { table: string; events: string }[]
} {
	return {
		channelName: 'bookings_queue_live_v1',
		schema: REALTIME_SCHEMA,
		sources: [
			{ table: 'bookings', events: 'INSERT,UPDATE' },
			{ table: 'trips', events: '*' },
			{ table: 'booking_trips', events: 'INSERT,UPDATE' },
		],
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
 * Subscribe for **`/ops/bookings`** live updates: **`bookings`**, **`trips`**, **`booking_trips`**.
 * Use when **`bookings`** and **`booking_trips`** are in **`supabase_realtime`** (see migrations).
 */
export function subscribeBookingsQueueLive(
	supabase: SupabaseClient,
	handlers: {
		onPayload: () => void
		onSubscribeStatus?: (status: string, err?: Error) => void
	},
): RealtimeChannel {
	const spec = bookingsQueueLiveRealtimeSubscriptionSpec()
	const { schema } = spec
	return supabase
		.channel(spec.channelName)
		.on(
			'postgres_changes',
			{ event: 'INSERT', schema, table: 'bookings' },
			() => {
				handlers.onPayload()
			},
		)
		.on(
			'postgres_changes',
			{ event: 'UPDATE', schema, table: 'bookings' },
			() => {
				handlers.onPayload()
			},
		)
		.on(
			'postgres_changes',
			{ event: '*', schema, table: 'trips' },
			() => {
				handlers.onPayload()
			},
		)
		.on(
			'postgres_changes',
			{ event: 'INSERT', schema, table: 'booking_trips' },
			() => {
				handlers.onPayload()
			},
		)
		.on(
			'postgres_changes',
			{ event: 'UPDATE', schema, table: 'booking_trips' },
			() => {
				handlers.onPayload()
			},
		)
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
