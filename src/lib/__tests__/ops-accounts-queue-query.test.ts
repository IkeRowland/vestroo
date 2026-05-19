import { describe, expect, it } from 'vitest'

import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import {
	accountsQueueHref,
	deriveAccountsQueueStageForBookingRow,
	getIgnoredAccountsQueueParamKeys,
	OPS_ACCOUNTS_NEW_QUEUE_HREF,
	OPS_ACCOUNTS_STAGE_ORDER,
	opsAccountsStageLabel,
	parseOpsAccountsQueueFull,
	parseOpsAccountsQueueSearchParams,
} from '@/lib/ops-accounts-queue-query'

describe('ops-accounts-queue-query (Story 16.21 / US-A2)', () => {
	describe('parseOpsAccountsQueueSearchParams', () => {
		it('defaults to "new" when stage is missing', () => {
			expect(parseOpsAccountsQueueSearchParams({})).toBe('new')
		})

		it('accepts every supported stage token', () => {
			for (const stage of OPS_ACCOUNTS_STAGE_ORDER) {
				expect(parseOpsAccountsQueueSearchParams({ stage })).toBe(stage)
			}
		})

		it('falls back to "new" on unknown stage tokens', () => {
			expect(parseOpsAccountsQueueSearchParams({ stage: 'totally_made_up' })).toBe('new')
		})

		it('takes the first stage token when an array is provided', () => {
			expect(parseOpsAccountsQueueSearchParams({ stage: ['invoiced', 'paid'] })).toBe('invoiced')
		})

		it('does not accept walk-in-only tokens (cross-queue contamination)', () => {
			expect(parseOpsAccountsQueueSearchParams({ stage: 'awaiting_payment' })).toBe('new')
			expect(parseOpsAccountsQueueSearchParams({ stage: 'ready_to_assign' })).toBe('new')
			expect(parseOpsAccountsQueueSearchParams({ stage: 'quote_sent' })).toBe('new')
		})
	})

	describe('parseOpsAccountsQueueFull', () => {
		it('hydrates the optional intent slice from booking-queue parser', () => {
			const parsed = parseOpsAccountsQueueFull({ stage: 'new', intent: 'trip_request' })
			expect(parsed.stage).toBe('new')
			expect(parsed.intents).toEqual(['trip_request'])
		})

		it('keeps only the first recognised intent (defer F1/A4 multi-intent parity)', () => {
			const parsed = parseOpsAccountsQueueFull({
				stage: 'invoiced',
				intent: ['point_to_point', 'hourly_hire'],
			})
			expect(parsed.stage).toBe('invoiced')
			expect(parsed.intents).toHaveLength(1)
		})

		it('drops unknown intents while keeping a valid stage', () => {
			const parsed = parseOpsAccountsQueueFull({ stage: 'assigned', intent: 'unknown' })
			expect(parsed.stage).toBe('assigned')
			expect(parsed.intents).toEqual([])
		})
	})

	describe('getIgnoredAccountsQueueParamKeys', () => {
		it('flags unknown stage tokens', () => {
			expect(getIgnoredAccountsQueueParamKeys({ stage: 'bogus' })).toContain('stage')
		})

		it('flags unknown intent tokens', () => {
			expect(getIgnoredAccountsQueueParamKeys({ intent: 'bogus' })).toContain('intent')
		})

		it('returns empty for valid combinations', () => {
			expect(
				getIgnoredAccountsQueueParamKeys({ stage: 'completed', intent: 'trip_request' }),
			).toEqual([])
		})
	})

	describe('accountsQueueHref', () => {
		it('maps stage to bookings status filter', () => {
			expect(accountsQueueHref({ stage: 'invoiced' })).toContain('status=invoiced')
			expect(accountsQueueHref({ stage: 'invoiced' })).toContain('client=account_client')
		})

		it('omits intent param when intents are empty', () => {
			const u = new URL(accountsQueueHref({ stage: 'new', intents: [] }), 'https://example.com')
			expect(u.pathname).toBe(OPS_BOOKINGS_PATH)
			expect(u.searchParams.get('client')).toBe('account_client')
			expect(u.searchParams.get('status')).toBe('submitted')
			expect(u.searchParams.get('intent')).toBeNull()
		})

		it('serialises intents as repeated params', () => {
			const u = new URL(
				accountsQueueHref({ stage: 'new', intents: ['trip_request'] }),
				'https://example.com',
			)
			expect(u.searchParams.getAll('intent')).toEqual(['trip_request'])
		})

		it('OPS_ACCOUNTS_NEW_QUEUE_HREF targets account new slice on unified queue', () => {
			const u = new URL(OPS_ACCOUNTS_NEW_QUEUE_HREF, 'https://example.com')
			expect(u.pathname).toBe(OPS_BOOKINGS_PATH)
			expect(u.searchParams.get('client')).toBe('account_client')
			expect(u.searchParams.get('status')).toBe('submitted')
		})
	})

	describe('deriveAccountsQueueStageForBookingRow', () => {
		it('maps portal pending_confirmation stage', () => {
			expect(
				deriveAccountsQueueStageForBookingRow({
					client_type: 'account_client',
					status: 'pending_confirmation',
					availability_checked_at: null,
				}),
			).toBe('pending_confirmation')
		})
	})

	describe('opsAccountsStageLabel', () => {
		it('produces a human label for every stage token', () => {
			for (const stage of OPS_ACCOUNTS_STAGE_ORDER) {
				const label = opsAccountsStageLabel(stage)
				expect(label.length).toBeGreaterThan(0)
				expect(label).not.toMatch(/_/)
			}
		})

		it('matches the US-A2 tab order (9 stages)', () => {
			expect(OPS_ACCOUNTS_STAGE_ORDER).toEqual([
				'pending_confirmation',
				'new',
				'triaged',
				'availability_checked',
				'assigned',
				'in_progress',
				'completed',
				'invoiced',
				'paid',
			])
		})

		it('separates account-only stages from walk-in vocabulary (Q22)', () => {
			const overlap = (OPS_ACCOUNTS_STAGE_ORDER as readonly string[]).filter((s) =>
				['quote_sent', 'awaiting_payment', 'ready_to_assign'].includes(s),
			)
			expect(overlap).toEqual([])
		})
	})
})
