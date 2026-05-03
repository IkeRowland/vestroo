import { describe, it, expect } from 'vitest'

import {
	bookingsOpsRealtimeSubscriptionSpec,
	chauffeurAssignmentsRealtimeSubscriptionSpec,
	serviceRunsRealtimeSubscriptionSpec,
} from '@/lib/supabase/realtime'

describe('realtime subscription specs (SH.9.4)', () => {
	it('serviceRunsRealtimeSubscriptionSpec — unscoped channel and no filter', () => {
		expect(serviceRunsRealtimeSubscriptionSpec()).toEqual({
			channelName: 'service_runs_changes',
			filter: undefined,
			schema: 'public',
			table: 'service_runs',
			event: '*',
		})
	})

	it('serviceRunsRealtimeSubscriptionSpec — scoped filter for one run', () => {
		const runId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
		expect(serviceRunsRealtimeSubscriptionSpec({ serviceRunId: runId })).toEqual({
			channelName: `service_runs_changes:${runId}`,
			filter: `id=eq.${runId}`,
			schema: 'public',
			table: 'service_runs',
			event: '*',
		})
	})

	it('bookingsOpsRealtimeSubscriptionSpec — INSERT + UPDATE on bookings', () => {
		expect(bookingsOpsRealtimeSubscriptionSpec()).toEqual({
			channelName: 'bookings_ops_queue_changes',
			schema: 'public',
			table: 'bookings',
			events: ['INSERT', 'UPDATE'],
		})
	})

	it('chauffeurAssignmentsRealtimeSubscriptionSpec — optional chauffeur filter', () => {
		const uid = '11111111-2222-3333-4444-555555555555'
		expect(chauffeurAssignmentsRealtimeSubscriptionSpec({ chauffeurId: uid })).toEqual({
			channelName: `chauffeur_assignments_changes:${uid}`,
			filter: `chauffeur_id=eq.${uid}`,
			schema: 'public',
			table: 'chauffeur_assignments',
			event: '*',
		})
	})
})
