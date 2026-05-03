import type { BookingTripConfirmationSendRow } from '@/lib/account-trip-confirmation-email-data'
import { buildAccountTripConfirmationProps } from '@/lib/account-trip-confirmation-email-data'
import { renderAccountTripConfirmationHtml } from '@/lib/email/templates/account-trip-confirmation'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Same embed tree as `sendBookingQuote` / Story 13.7. */
export const BOOKING_TRIP_CONFIRMATION_MAIL_SELECT =
	'id, status, client_type, customer_email, customer_id, customer_account_id, account_snapshot, ' +
	'payment_reference, pickup_datetime, origin_name, destination_name, customer_name, ' +
	'rider_name, rider_email, rider_phone, ' +
	'booking_trips (' +
	'sort_order, ' +
	'trips (' +
	'id, time_start_estimate, time_end_estimate, chauffeur_id, ' +
	'vehicles ( name, vehicle_categories ( name ) )' +
	')' +
	')'

export async function loadBookingRowForTripConfirmationEmail(
	supabase: SupabaseClient,
	bookingId: string,
): Promise<
	| { ok: true; booking: BookingTripConfirmationSendRow }
	| { ok: false; message: 'not_found' | 'invalid_shape' }
> {
	const { data: bookingRaw, error: bErr } = await supabase
		.from('bookings')
		.select(BOOKING_TRIP_CONFIRMATION_MAIL_SELECT)
		.eq('id', bookingId)
		.maybeSingle()

	if (
		bErr ||
		bookingRaw == null ||
		typeof bookingRaw !== 'object' ||
		!('id' in bookingRaw) ||
		typeof (bookingRaw as { id?: unknown }).id !== 'string'
	) {
		return { ok: false, message: 'not_found' }
	}

	return { ok: true, booking: bookingRaw as BookingTripConfirmationSendRow }
}

export async function resolveRenderedTripConfirmationHtmlForSentQuote(input: {
	supabase: SupabaseClient
	booking: BookingTripConfirmationSendRow
	quoteRow: {
		line_items: unknown
		total_zar: number
		rendered_html: string | null
	}
}): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
	const stored = input.quoteRow.rendered_html
	if (typeof stored === 'string' && stored.trim() !== '') {
		const hasRiderTrackArtifact =
			stored.includes('/track/') ||
			stored.includes('Rider tracking') ||
			stored.includes('id="rider-tracking"')
		if (hasRiderTrackArtifact) {
			return { ok: true, html: stored }
		}
		/* Pre-15B.2 stored HTML or first render without estimates — recompute so retries pick up minting. */
	}

	const acctId = input.booking.customer_account_id as string | null
	let accountRow: { credit_terms_days?: number } | null = null
	if (acctId) {
		const { data: ca } = await input.supabase
			.from('customer_accounts')
			.select('credit_terms_days')
			.eq('id', acctId)
			.maybeSingle()
		accountRow = ca as { credit_terms_days?: number } | null
	}

	const props = await buildAccountTripConfirmationProps({
		supabase: input.supabase,
		booking: input.booking,
		lineItemsRaw: input.quoteRow.line_items,
		totalZar: input.quoteRow.total_zar,
		accountRow,
	})
	const html = renderAccountTripConfirmationHtml(props)
	if (html.trim() === '') {
		return { ok: false, message: 'empty_rendered_html' }
	}
	return { ok: true, html }
}

export async function maybeBackfillQuoteRenderedHtml(input: {
	supabase: SupabaseClient
	quoteId: string
	html: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
	const { error } = await input.supabase
		.from('booking_quotes')
		.update({ rendered_html: input.html })
		.eq('id', input.quoteId)
		.is('rendered_html', null)

	if (error) {
		return { ok: false, message: error.message }
	}
	return { ok: true }
}

export function bookingRefForTripConfirmationSubject(booking: BookingTripConfirmationSendRow): string {
	const pr = booking.payment_reference
	if (pr != null && String(pr).trim() !== '') {
		return String(pr).trim()
	}
	return booking.id as string
}

export function buildTripConfirmationEmailSubject(booking: BookingTripConfirmationSendRow): string {
	return `Trip confirmation and quote · ${bookingRefForTripConfirmationSubject(booking)}`
}
