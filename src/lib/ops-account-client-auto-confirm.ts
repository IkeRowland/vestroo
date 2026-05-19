import type { SupabaseClient } from '@supabase/supabase-js'

import { evaluateAccountClientConfirmationTripGate } from '@/lib/ops-account-client-confirmation-trip-gate'
import { appendBookingStatusHistoryEntry } from '@/lib/ops-trip-complete-booking-invoice-hook'

export type TryAutoConfirmAccountClientBookingResult =
	| { confirmed: true; quoteId: string }
	| { confirmed: false; reason: 'not_applicable' | 'not_ready' }

/**
 * When an account portal booking is `pending_confirmation` with a saved quote and a linked trip
 * that passes readiness checks, moves it to `assigned` without a separate ops confirm click.
 */
export async function tryAutoConfirmAccountClientBooking(
	supabase: SupabaseClient,
	bookingId: string,
): Promise<TryAutoConfirmAccountClientBookingResult> {
	const { data: booking, error: bErr } = await supabase
		.from('bookings')
		.select('id, client_type, status, status_history')
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr || !booking) {
		return { confirmed: false, reason: 'not_applicable' }
	}

	if (booking.client_type !== 'account_client') {
		return { confirmed: false, reason: 'not_applicable' }
	}

	if (booking.status !== 'pending_confirmation') {
		return { confirmed: false, reason: 'not_applicable' }
	}

	const tripGate = await evaluateAccountClientConfirmationTripGate(supabase, bookingId)
	if (!tripGate.ok) {
		return { confirmed: false, reason: 'not_ready' }
	}

	const { data: quoteRow, error: qErr } = await supabase
		.from('booking_quotes')
		.select('id, status')
		.eq('booking_id', bookingId)
		.order('version', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (qErr || !quoteRow?.id) {
		return { confirmed: false, reason: 'not_ready' }
	}

	const qs = String(quoteRow.status ?? '')
	if (!['draft', 'sent', 'accepted'].includes(qs)) {
		return { confirmed: false, reason: 'not_ready' }
	}

	const prev = String(booking.status ?? '')
	const nextHistory = appendBookingStatusHistoryEntry(
		(booking as { status_history?: unknown }).status_history,
		prev,
		'assigned',
		'ops_confirm_account_client_booking',
	)

	const { error: upErr } = await supabase
		.from('bookings')
		.update({
			status: 'assigned',
			status_history: nextHistory,
			current_quote_id: quoteRow.id as string,
		})
		.eq('id', bookingId)
		.eq('status', 'pending_confirmation')

	if (upErr) {
		return { confirmed: false, reason: 'not_ready' }
	}

	return { confirmed: true, quoteId: quoteRow.id as string }
}
