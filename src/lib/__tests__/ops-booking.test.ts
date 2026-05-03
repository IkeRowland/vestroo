import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import {
	accountDispatchResultFromRpcData,
	isBookingDispatchable,
} from '@/lib/ops-booking'
import type { CanDispatchAccountBookingReasonDb } from '@/types/database.types'

const ACCOUNT_FAILURE_REASONS: Exclude<CanDispatchAccountBookingReasonDb, 'ok'>[] = [
	'booking_not_found',
	'not_an_account_booking',
	'account_not_found',
	'account_on_hold',
	'account_suspended',
	'account_closed',
	'contract_not_yet_active',
	'contract_expired',
	'po_required_and_missing',
	'credit_limit_exceeded',
	'overdue_invoices',
]

function mockSupabaseRpc(
	rpcImpl: (name: string, args: { p_booking_id: string }) => Promise<{ data: unknown; error: null }>,
): SupabaseClient {
	return {
		rpc: vi.fn((name: string, args: { p_booking_id: string }) => rpcImpl(name, args)),
	} as unknown as SupabaseClient
}

describe('accountDispatchResultFromRpcData', () => {
	it('returns ok when SQL reports success', () => {
		expect(accountDispatchResultFromRpcData([{ can_dispatch: true, reason: 'ok' }])).toEqual({ ok: true })
	})

	it.each(ACCOUNT_FAILURE_REASONS)('maps failure reason %s', (reason) => {
		expect(accountDispatchResultFromRpcData([{ can_dispatch: false, reason }])).toEqual({
			ok: false,
			reasonCode: reason,
		})
	})

	it('uses unknown when RPC shape is empty', () => {
		expect(accountDispatchResultFromRpcData([])).toEqual({ ok: false, reasonCode: 'unknown' })
	})
})

describe('isBookingDispatchable', () => {
	it('walk_in: legacy paid+paid, ready_to_assign RTA, and trip_request paid (no RPC)', async () => {
		const supabase = mockSupabaseRpc(async () => ({ data: null, error: null }))
		await expect(
			isBookingDispatchable(supabase, {
				id: '00000000-0000-4000-8000-000000000001',
				client_type: 'walk_in',
				status: 'paid',
				payment_status: 'paid',
			}),
		).resolves.toEqual({ ok: true })
		expect(supabase.rpc).not.toHaveBeenCalled()

		await expect(
			isBookingDispatchable(supabase, {
				id: '00000000-0000-4000-8000-000000000001',
				client_type: 'walk_in',
				status: 'ready_to_assign',
				payment_status: 'pending',
				booking_intent: 'point_to_point',
			}),
		).resolves.toEqual({ ok: true })

		await expect(
			isBookingDispatchable(supabase, {
				id: '00000000-0000-4000-8000-000000000001',
				client_type: 'walk_in',
				status: 'ready_to_assign',
				payment_status: 'paid',
				booking_intent: 'trip_request',
			}),
		).resolves.toEqual({ ok: true })

		await expect(
			isBookingDispatchable(supabase, {
				id: '00000000-0000-4000-8000-000000000001',
				client_type: 'walk_in',
				status: 'ready_to_assign',
				payment_status: 'pending',
				booking_intent: 'trip_request',
			}),
		).resolves.toEqual({ ok: false, kind: 'walk_in_unpaid' })

		await expect(
			isBookingDispatchable(supabase, {
				id: '00000000-0000-4000-8000-000000000001',
				client_type: 'walk_in',
				status: 'pending',
				payment_status: 'paid',
			}),
		).resolves.toEqual({ ok: false, kind: 'walk_in_unpaid' })

		await expect(
			isBookingDispatchable(supabase, {
				id: '00000000-0000-4000-8000-000000000001',
				client_type: 'walk_in',
				status: 'paid',
				payment_status: 'pending',
			}),
		).resolves.toEqual({ ok: false, kind: 'walk_in_unpaid' })
	})

	it('account_client: delegates to can_dispatch_account_booking RPC', async () => {
		const supabase = mockSupabaseRpc(async (name, args) => {
			expect(name).toBe('can_dispatch_account_booking')
			expect(args.p_booking_id).toBe('00000000-0000-4000-8000-000000000002')
			return { data: [{ can_dispatch: true, reason: 'ok' }], error: null }
		})
		await expect(
			isBookingDispatchable(supabase, {
				id: '00000000-0000-4000-8000-000000000002',
				client_type: 'account_client',
				status: 'pending',
				payment_status: 'pending',
			}),
		).resolves.toEqual({ ok: true })
	})

	it.each(ACCOUNT_FAILURE_REASONS)('account_client: surfaces SQL reason %s', async (reason) => {
		const supabase = mockSupabaseRpc(async () => ({
			data: [{ can_dispatch: false, reason }],
			error: null,
		}))
		await expect(
			isBookingDispatchable(supabase, {
				id: '00000000-0000-4000-8000-000000000003',
				client_type: 'account_client',
				status: 'paid',
				payment_status: 'paid',
			}),
		).resolves.toEqual({ ok: false, kind: 'account_guardrail', reasonCode: reason })
	})

	it('account_client: returns rpc_error when RPC fails', async () => {
		const supabase = {
			rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'network' } }),
		} as unknown as SupabaseClient
		await expect(
			isBookingDispatchable(supabase, {
				id: '00000000-0000-4000-8000-000000000004',
				client_type: 'account_client',
				status: 'paid',
				payment_status: 'paid',
			}),
		).resolves.toEqual({ ok: false, kind: 'rpc_error', message: 'network' })
	})
})
