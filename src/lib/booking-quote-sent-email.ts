import type { SupabaseClient } from '@supabase/supabase-js'

import type { ClientTypeDb } from '@/types/database.types'

export type BookingRowForQuoteEmail = {
	client_type: ClientTypeDb
	customer_email: string | null
	customer_id: string | null
	customer_account_id: string | null
	account_snapshot: unknown | null
}

/**
 * Resolves the outbound quote email (13.4). Priority:
 * 1) `customer_account_members.email` for the booker's `profile_id` on the booking account (account_client).
 * 2) `bookings.customer_email`.
 * 3) Optional `account_snapshot.contact_email` if present as a non-empty string (forward-compatible).
 */
export async function resolveSentToEmailForBooking(
	supabase: SupabaseClient,
	booking: BookingRowForQuoteEmail,
): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
	if (
		booking.client_type === 'account_client' &&
		booking.customer_account_id &&
		booking.customer_id
	) {
		const { data: member, error } = await supabase
			.from('customer_account_members')
			.select('email')
			.eq('account_id', booking.customer_account_id)
			.eq('profile_id', booking.customer_id)
			.maybeSingle()

		if (error) {
			return { ok: false, message: 'Could not load account member for recipient email.' }
		}
		const fromMember = member?.email?.trim().toLowerCase()
		if (fromMember) {
			return { ok: true, email: fromMember }
		}
	}

	const snap = booking.account_snapshot
	if (snap && typeof snap === 'object' && !Array.isArray(snap)) {
		const raw = (snap as Record<string, unknown>).contact_email
		if (typeof raw === 'string') {
			const fromSnap = raw.trim().toLowerCase()
			if (fromSnap) {
				return { ok: true, email: fromSnap }
			}
		}
	}

	const fromBooking = (booking.customer_email ?? '').trim().toLowerCase()
	if (fromBooking) {
		return { ok: true, email: fromBooking }
	}

	return { ok: false, message: 'No recipient email on file for this booking.' }
}
