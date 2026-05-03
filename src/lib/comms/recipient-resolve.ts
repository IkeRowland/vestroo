import type { SupabaseClient } from '@supabase/supabase-js'

import { resolveSentToEmailForBooking } from '@/lib/booking-quote-sent-email'
import type { CommsDispatchRecipientRole } from '@/types/comms'
import type { ClientTypeDb } from '@/types/database.types'

export type CommsRecipientResolutionBooking = {
	client_type: ClientTypeDb
	customer_email: string | null
	customer_id: string | null
	customer_account_id: string | null
	account_snapshot: unknown | null
	rider_email?: string | null
}

function isEmptyRecipientFilter(filter: Record<string, unknown>): boolean {
	return Object.keys(filter).length === 0
}

/**
 * Resolves outbound **email** for a dispatch rule (`recipient_filter` `{}` only in 15C.2).
 * Unknown / unsupported roles → skip (no throw).
 */
export async function resolveCommsEmailRecipient(
	supabase: SupabaseClient,
	role: CommsDispatchRecipientRole,
	recipientFilter: Record<string, unknown>,
	booking: CommsRecipientResolutionBooking,
): Promise<{ ok: true; email: string } | { ok: false; reason: string }> {
	if (!isEmptyRecipientFilter(recipientFilter)) {
		return { ok: false, reason: 'non_empty_recipient_filter' }
	}

	if (role === 'booker' || role === 'customer') {
		const result = await resolveSentToEmailForBooking(supabase, {
			client_type: booking.client_type,
			customer_email: booking.customer_email,
			customer_id: booking.customer_id,
			customer_account_id: booking.customer_account_id,
			account_snapshot: booking.account_snapshot,
		})
		if (result.ok) return { ok: true, email: result.email }
		return { ok: false, reason: result.message }
	}

	if (role === 'rider') {
		const raw = booking.rider_email?.trim().toLowerCase() ?? ''
		if (raw && raw.includes('@')) {
			return { ok: true, email: raw }
		}
		return { ok: false, reason: 'missing_rider_email' }
	}

	if (role === 'ops' || role === 'dispatcher' || role === 'admin') {
		const raw = (process.env.SUPPORT_EMAIL ?? '').trim().toLowerCase()
		if (raw && raw.includes('@')) {
			return { ok: true, email: raw }
		}
		return { ok: false, reason: 'missing_support_email' }
	}

	if (role === 'chauffeur') {
		return { ok: false, reason: 'chauffeur_email_not_implemented' }
	}

	return { ok: false, reason: 'unknown_role' }
}
