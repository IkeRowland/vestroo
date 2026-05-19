import { describe, expect, it } from 'vitest'

import {
	buildAccountPortalLifecycleTimelineItems,
	tripStartedAtIsoFromBookingTripsEmbed,
} from '@/lib/account-portal-booking-lifecycle-timeline'

describe('buildAccountPortalLifecycleTimelineItems', () => {
	it('includes created, confirmed, trip started, and completed from history embeds', () => {
		const items = buildAccountPortalLifecycleTimelineItems({
			createdAt: '2026-05-01T08:00:00.000Z',
			statusHistory: [
				{
					at: '2026-05-01T09:00:00.000Z',
					from: 'pending_confirmation',
					to: 'assigned',
					source: 'ops_confirm',
				},
			],
			bookingTrips: [
				{
					sort_order: 0,
					trips: {
						status: 'completed',
						status_history: [
							{
								at: '2026-05-02T10:00:00.000Z',
								from: 'assigned',
								to: 'en_route',
								source: 'chauffeur',
							},
							{
								at: '2026-05-02T14:00:00.000Z',
								from: 'en_route',
								to: 'completed',
								source: 'chauffeur',
							},
						],
						updated_at: '2026-05-02T14:05:00.000Z',
					},
				},
			],
		})

		expect(items.map((i) => i.kind)).toEqual([
			'created',
			'booking_confirmed',
			'trip_started',
			'trip_completed',
		])
		expect(items[0]?.at).toBe('2026-05-01T08:00:00.000Z')
		expect(items[1]?.at).toBe('2026-05-01T09:00:00.000Z')
		expect(items[2]?.at).toBe('2026-05-02T10:00:00.000Z')
		expect(items[3]?.at).toBe('2026-05-02T14:00:00.000Z')
	})

	it('always includes booking created when pending confirmation', () => {
		const items = buildAccountPortalLifecycleTimelineItems({
			createdAt: '2026-05-01T08:00:00.000Z',
			statusHistory: [],
			bookingTrips: [],
		})
		expect(items).toHaveLength(1)
		expect(items[0]?.kind).toBe('created')
	})
})

describe('tripStartedAtIsoFromBookingTripsEmbed', () => {
	it('returns earliest en_route transition', () => {
		const iso = tripStartedAtIsoFromBookingTripsEmbed([
			{
				trips: {
					status_history: [
						{ at: '2026-05-02T12:00:00.000Z', to: 'en_route', from: 'assigned' },
						{ at: '2026-05-02T10:00:00.000Z', to: 'en_route', from: 'assigned' },
					],
				},
			},
		])
		expect(iso).toBe('2026-05-02T10:00:00.000Z')
	})
})
