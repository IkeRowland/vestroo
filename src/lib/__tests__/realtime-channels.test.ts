import { describe, it, expect } from 'vitest'

import {
	bookingsOpsRealtimeSubscriptionSpec,
	bookingsQueueLiveRealtimeSubscriptionSpec,
	chauffeurAssignmentsRealtimeSubscriptionSpec,
} from '@/lib/supabase/realtime'

describe('realtime subscription specs', () => {
	it('bookingsOpsRealtimeSubscriptionSpec — INSERT + UPDATE on bookings', () => {
		expect(bookingsOpsRealtimeSubscriptionSpec()).toEqual({
			channelName: 'bookings_ops_queue_changes',
			schema: 'public',
			table: 'bookings',
			events: ['INSERT', 'UPDATE'],
		})
	})

	it('bookingsQueueLiveRealtimeSubscriptionSpec — bookings, trips, booking_trips', () => {
		expect(bookingsQueueLiveRealtimeSubscriptionSpec()).toEqual({
			channelName: 'bookings_queue_live_v1',
			schema: 'public',
			sources: [
				{ table: 'bookings', events: 'INSERT,UPDATE' },
				{ table: 'trips', events: '*' },
				{ table: 'booking_trips', events: 'INSERT,UPDATE' },
			],
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
