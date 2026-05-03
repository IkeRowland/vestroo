import type { SupabaseClient } from '@supabase/supabase-js'

import type { BookingQuoteRowDb } from '@/types/database.types'

const BOOKING_QUOTE_DETAIL_SELECT =
	'id, booking_id, version, total_zar, line_items, rendered_html, pdf_storage_path, expires_at, sent_at, sent_to_email, status, created_at'

export type OpsBookingQuoteDetailRow = Pick<
	BookingQuoteRowDb,
	| 'id'
	| 'booking_id'
	| 'version'
	| 'total_zar'
	| 'line_items'
	| 'rendered_html'
	| 'pdf_storage_path'
	| 'expires_at'
	| 'sent_at'
	| 'sent_to_email'
	| 'status'
	| 'created_at'
>

/**
 * US-B2 / Story 13.5: Prefer `bookings.current_quote_id` when set; if that row is missing,
 * or when `current_quote_id` is null, fall back to `v_booking_current_quote` (latest sent/accepted).
 */
export function pickResolvedBookingQuote(
	currentQuoteId: string | null | undefined,
	quoteByCurrentId: OpsBookingQuoteDetailRow | null,
	quoteFromView: OpsBookingQuoteDetailRow | null,
): OpsBookingQuoteDetailRow | null {
	if (currentQuoteId) {
		if (quoteByCurrentId) {
			return quoteByCurrentId
		}
	}
	return quoteFromView
}

export async function loadResolvedBookingQuoteForOps(
	supabase: SupabaseClient,
	bookingId: string,
	currentQuoteId: string | null,
): Promise<OpsBookingQuoteDetailRow | null> {
	let byId: OpsBookingQuoteDetailRow | null = null
	if (currentQuoteId) {
		const { data, error } = await supabase
			.from('booking_quotes')
			.select(BOOKING_QUOTE_DETAIL_SELECT)
			.eq('id', currentQuoteId)
			.maybeSingle()
		if (error) {
			throw new Error(error.message)
		}
		byId = data as OpsBookingQuoteDetailRow | null
	}

	const { data: fromView, error: viewErr } = await supabase
		.from('v_booking_current_quote')
		.select(BOOKING_QUOTE_DETAIL_SELECT)
		.eq('booking_id', bookingId)
		.maybeSingle()

	if (viewErr) {
		throw new Error(viewErr.message)
	}

	return pickResolvedBookingQuote(
		currentQuoteId,
		byId,
		fromView as OpsBookingQuoteDetailRow | null,
	)
}

export function quoteStatusAllowsResend(status: string): boolean {
	return status === 'sent' || status === 'accepted'
}
