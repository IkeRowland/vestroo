import { describe, expect, it } from 'vitest'

import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import {
	getIgnoredWalkInQueueParamKeys,
	OPS_WALK_IN_NEW_QUEUE_HREF,
	OPS_WALK_IN_STAGE_ORDER,
	deriveWalkInQueueStageForBookingRow,
	opsWalkInStageLabel,
	parseOpsWalkInQueueFull,
	parseOpsWalkInQueueSearchParams,
	walkInQueueHref,
} from '@/lib/ops-walk-in-queue-query'

describe('ops-walk-in-queue-query (Story 16.20 / US-A1)', () => {
	describe('parseOpsWalkInQueueSearchParams', () => {
		it('defaults to "new" when stage is missing', () => {
			expect(parseOpsWalkInQueueSearchParams({})).toBe('new')
		})

		it('accepts every supported stage token', () => {
			for (const stage of OPS_WALK_IN_STAGE_ORDER) {
				expect(parseOpsWalkInQueueSearchParams({ stage })).toBe(stage)
			}
		})

		it('falls back to "new" on unknown stage tokens', () => {
			expect(parseOpsWalkInQueueSearchParams({ stage: 'totally_made_up' })).toBe('new')
		})

		it('takes the first stage token when an array is provided', () => {
			expect(
				parseOpsWalkInQueueSearchParams({ stage: ['quote_sent', 'awaiting_payment'] }),
			).toBe('quote_sent')
		})
	})

	describe('parseOpsWalkInQueueFull', () => {
		it('hydrates the optional intent slice from booking-queue parser', () => {
			const parsed = parseOpsWalkInQueueFull({ stage: 'new', intent: 'trip_request' })
			expect(parsed.stage).toBe('new')
			expect(parsed.intents).toEqual(['trip_request'])
		})

		it('keeps only the first recognised intent (defer F1/A4 multi-intent parity)', () => {
			const parsed = parseOpsWalkInQueueFull({
				stage: 'new',
				intent: ['point_to_point', 'hourly_hire'],
			})
			expect(parsed.intents).toHaveLength(1)
		})

		it('drops unknown intents while keeping a valid stage', () => {
			const parsed = parseOpsWalkInQueueFull({ stage: 'triaged', intent: 'unknown' })
			expect(parsed.stage).toBe('triaged')
			expect(parsed.intents).toEqual([])
		})
	})

	describe('getIgnoredWalkInQueueParamKeys', () => {
		it('flags unknown stage tokens', () => {
			expect(getIgnoredWalkInQueueParamKeys({ stage: 'bogus' })).toContain('stage')
		})

		it('flags unknown intent tokens (proxied via booking-queue ignored keys)', () => {
			expect(getIgnoredWalkInQueueParamKeys({ intent: 'bogus' })).toContain('intent')
		})

		it('returns empty for valid combinations', () => {
			expect(getIgnoredWalkInQueueParamKeys({ stage: 'new', intent: 'trip_request' })).toEqual(
				[],
			)
		})
	})

	describe('walkInQueueHref', () => {
		it('maps stage to bookings status filter', () => {
			expect(walkInQueueHref({ stage: 'awaiting_payment' })).toContain('status=awaiting_payment')
			expect(walkInQueueHref({ stage: 'awaiting_payment' })).toContain('client=walk_in')
		})

		it('omits intent param when intents are empty', () => {
			const u = new URL(walkInQueueHref({ stage: 'new', intents: [] }), 'https://example.com')
			expect(u.pathname).toBe(OPS_BOOKINGS_PATH)
			expect(u.searchParams.get('client')).toBe('walk_in')
			expect(u.searchParams.get('status')).toBe('submitted')
			expect(u.searchParams.get('intent')).toBeNull()
		})

		it('serialises intents as repeated params', () => {
			const u = new URL(
				walkInQueueHref({ stage: 'new', intents: ['trip_request'] }),
				'https://example.com',
			)
			expect(u.searchParams.getAll('intent')).toEqual(['trip_request'])
		})

		it('OPS_WALK_IN_NEW_QUEUE_HREF targets walk-in new slice on unified queue', () => {
			const u = new URL(OPS_WALK_IN_NEW_QUEUE_HREF, 'https://example.com')
			expect(u.pathname).toBe(OPS_BOOKINGS_PATH)
			expect(u.searchParams.get('client')).toBe('walk_in')
			expect(u.searchParams.get('status')).toBe('submitted')
		})
	})

	describe('deriveWalkInQueueStageForBookingRow', () => {
		const walkInBase = {
			client_type: 'walk_in' as const,
			availability_checked_at: null as string | null,
		}

		it('returns null for non–walk-in clients', () => {
			expect(
				deriveWalkInQueueStageForBookingRow({
					...walkInBase,
					client_type: 'account_client',
					status: 'ready_to_assign',
				}),
			).toBeNull()
		})

		it('maps assigned → in_progress', () => {
			expect(
				deriveWalkInQueueStageForBookingRow({ ...walkInBase, status: 'assigned' }),
			).toBe('in_progress')
		})

		it('maps cancelled and expired → completed (queue view-only CTAs)', () => {
			expect(
				deriveWalkInQueueStageForBookingRow({ ...walkInBase, status: 'cancelled' }),
			).toBe('completed')
			expect(
				deriveWalkInQueueStageForBookingRow({ ...walkInBase, status: 'expired' }),
			).toBe('completed')
		})

		it('when ready_to_assign but booking_trips embed has a vehicle, returns in_progress', () => {
			const booking_trips = [
				{
					sort_order: 0,
					trips: {
						vehicles: { name: 'Shuttle A' },
					},
				},
			]
			expect(
				deriveWalkInQueueStageForBookingRow({
					...walkInBase,
					status: 'ready_to_assign',
					booking_trips,
				}),
			).toBe('in_progress')
		})
		it('when ready_to_assign but linked trip status is completed, returns completed', () => {
			const booking_trips = [
				{
					sort_order: 0,
					trips: {
						status: 'completed',
						vehicles: { name: 'Shuttle A' },
					},
				},
			]
			expect(
				deriveWalkInQueueStageForBookingRow({
					...walkInBase,
					status: 'ready_to_assign',
					booking_trips,
				}),
			).toBe('completed')
		})
	})

	describe('opsWalkInStageLabel', () => {
		it('produces a human label for every stage token', () => {
			for (const stage of OPS_WALK_IN_STAGE_ORDER) {
				const label = opsWalkInStageLabel(stage)
				expect(label.length).toBeGreaterThan(0)
				expect(label).not.toMatch(/_/)
			}
		})

		it('matches the US-A1 tab order (8 stages)', () => {
			expect(OPS_WALK_IN_STAGE_ORDER).toEqual([
				'new',
				'triaged',
				'availability_checked',
				'quote_sent',
				'awaiting_payment',
				'ready_to_assign',
				'in_progress',
				'completed',
			])
		})
	})
})
