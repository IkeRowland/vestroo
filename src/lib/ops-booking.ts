import type { SupabaseClient } from '@supabase/supabase-js'

import { parseCanDispatchRpcRows } from '@/lib/account-po-policy'
import { isTripRequestIntent } from '@/lib/fulfil-queue-buckets'

/**
 * Input for dispatch gating: `client_type` branches walk-in paid gate vs SQL guardrail (Epic 13 / US-A1).
 */
export type BookingDispatchGateInput = {
	id: string
	client_type: 'walk_in' | 'account_client'
	status: string | null
	payment_status: string | null
	/** When set, walk-in / public path matches {@link matchesPaidBucket} (fulfil Assignment tab). */
	booking_intent?: string | null
}

export type IsBookingDispatchableResult =
	| { ok: true }
	| { ok: false; kind: 'walk_in_unpaid' }
	| { ok: false; kind: 'account_guardrail'; reasonCode: string }
	| { ok: false; kind: 'rpc_error'; message: string }

/**
 * Maps `can_dispatch_account_booking` RPC rows — authoritative account path; no duplicate business rules in TS.
 */
export function accountDispatchResultFromRpcData(
	data: unknown,
): { ok: true } | { ok: false; reasonCode: string } {
	const gate = parseCanDispatchRpcRows(data)
	if (gate?.can_dispatch === true && gate.reason === 'ok') {
		return { ok: true }
	}
	const reasonCode = gate?.reason ?? 'unknown'
	return { ok: false, reasonCode }
}

/**
 * Walk-in / public: align with fulfil **`matchesPaidBucket`** — **`ready_to_assign`** is the assignment
 * gate; trip requests additionally require **`payment_status = paid`** (Epic 14 / fulfil tabs).
 * Legacy rows with **`status = paid`** and **`payment_status = paid`** remain dispatchable.
 * Account: delegates to `can_dispatch_account_booking(booking.id)` via RPC.
 */
export async function isBookingDispatchable(
	supabase: SupabaseClient,
	booking: BookingDispatchGateInput,
): Promise<IsBookingDispatchableResult> {
	if (booking.client_type !== 'account_client') {
		const st = booking.status
		const ps = booking.payment_status
		if (st === 'paid' && ps === 'paid') {
			return { ok: true }
		}
		if (st === 'ready_to_assign') {
			if (isTripRequestIntent(booking.booking_intent)) {
				return ps === 'paid' ? { ok: true } : { ok: false, kind: 'walk_in_unpaid' }
			}
			return { ok: true }
		}
		return { ok: false, kind: 'walk_in_unpaid' }
	}

	const { data, error } = await supabase.rpc('can_dispatch_account_booking', {
		p_booking_id: booking.id,
	})
	if (error) {
		return { ok: false, kind: 'rpc_error', message: error.message }
	}
	const mapped = accountDispatchResultFromRpcData(data)
	if (mapped.ok) {
		return { ok: true }
	}
	return { ok: false, kind: 'account_guardrail', reasonCode: mapped.reasonCode }
}
