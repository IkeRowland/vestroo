import type { SupabaseClient } from '@supabase/supabase-js'

import type { AccountDispatchGate } from '@/features/ops/components/AccountQueueRowActions'
import { fetchNotDispatchableAccountDetail } from '@/lib/account-dispatch-block-detail'
import {
	deriveAccountsQueueStageForBookingRow,
	type OpsAccountsStageDeriveInput,
} from '@/lib/ops-accounts-queue-query'
import { accountDispatchResultFromRpcData } from '@/lib/ops-booking'

type BookingDispatchInput = OpsAccountsStageDeriveInput & {
	id: string
	customer_account_id: string | null
	total_amount: number | null
}

/**
 * Resolves {@link AccountDispatchGate} for a single booking on `/ops/bookings/[id]` — same RPC
 * path as the account queue when the derived stage is **`availability_checked`** or **`assigned`**.
 */
export async function resolveAccountDispatchGateForBookingDetail(
	supabase: SupabaseClient,
	booking: BookingDispatchInput,
): Promise<AccountDispatchGate> {
	if (booking.client_type !== 'account_client') {
		return { kind: 'unknown' }
	}
	const stage = deriveAccountsQueueStageForBookingRow(booking)
	if (stage !== 'availability_checked' && stage !== 'assigned') {
		return { kind: 'unknown' }
	}
	const { data, error } = await supabase.rpc('can_dispatch_account_booking', {
		p_booking_id: booking.id,
	})
	if (error) {
		return { kind: 'unknown' }
	}
	const mapped = accountDispatchResultFromRpcData(data)
	if (mapped.ok) {
		return { kind: 'ok' }
	}
	const detail = await fetchNotDispatchableAccountDetail(supabase, {
		customerAccountId: booking.customer_account_id,
		reasonCode: mapped.reasonCode,
		bookingTotalAmount: booking.total_amount,
	})
	return { kind: 'blocked', reasonCode: mapped.reasonCode, detail }
}
