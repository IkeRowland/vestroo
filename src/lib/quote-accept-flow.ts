import { resolveSupportContactLine } from '@/lib/email/email-copy'
import { sendWalkInAcceptanceConfirmationForBooking } from '@/lib/email/send-walk-in-acceptance-confirmation'
import { loadWalkInQuoteBankContext } from '@/lib/email/walk-in-quote-bank-context'
import type { WalkInQuoteBankAccountDetails } from '@/lib/email/walk-in-quote-bank-context'
import { buildBookSearchPrefillHrefFromBooking } from '@/lib/quote-accept-prefill'
import { buildTripSummaryFromBookingRow } from '@/lib/quote-expired-trip'
import type { QuoteExpiredTripSummary } from '@/lib/quote-expired-trip'
import { verifyQuoteToken } from '@/lib/quote-tokens'
import { createServerClient } from '@/lib/supabase/server'
import type { BookingQuoteStatusDb } from '@/types/database.types'

export type QuoteAcceptEftDisplay =
	| {
			load: 'ok'
			paymentReference: string
			bankAccount: WalkInQuoteBankAccountDetails
	  }
	| {
			load: 'error'
			message: string
	  }

/**
 * Epic 14 / Story 14.3 — public `/q/[token]/accept` (**US-N6** in Epic 16 Theme N: EFT confirmation
 * + idempotent `quote_accepted_at`).
 */
export type QuoteAcceptViewModel =
	| { kind: 'quote_accepted_eft'; bookingReferenceLabel: string; eft: QuoteAcceptEftDisplay; supportContactLine: string }
	| { kind: 'already_accepted' }
	| { kind: 'already_paid' }
	| {
			kind: 'quote_state'
			variant: 'rejected' | 'superseded' | 'draft' | 'db_expired' | 'not_sent'
	  }
	| { kind: 'token'; reason: 'invalid_signature' | 'malformed' }
	| { kind: 'token_expired'; prefillHref: string; tripSummary: QuoteExpiredTripSummary | null }
	| { kind: 'not_found' }
	| { kind: 'wrong_client_type' }
	| { kind: 'booking_status_mismatch' }
	| { kind: 'transition_failed'; detail: string }

type BookingAcceptRow = {
	id: string
	status: string
	payment_status: string
	client_type: string
	customer_id: string | null
	customer_account_id: string | null
	account_snapshot: unknown | null
	payment_reference: string | null
	quote_accepted_at: string | null
	total_amount: number | string | null
	customer_name: string | null
	customer_email: string | null
	customer_phone: string | null
	origin_name: string | null
	destination_name: string | null
	origin_address: string | null
	destination_address: string | null
	passenger_count: number | null
	pickup_datetime: string | null
	booking_intent: string | null
}

const BOOKING_ACCEPT_SELECT =
	'id, status, payment_status, client_type, customer_id, customer_account_id, account_snapshot, ' +
	'payment_reference, quote_accepted_at, ' +
	'total_amount, customer_name, customer_email, customer_phone, ' +
	'origin_name, destination_name, origin_address, destination_address, passenger_count, pickup_datetime, booking_intent'

function bookingRefLabelFromRow(b: { id: string; payment_reference: string | null }): string {
	const pr = b.payment_reference != null ? String(b.payment_reference).trim() : ''
	return pr.length > 0 ? pr : b.id
}

async function loadBookingForAccept(
	supabase: Awaited<ReturnType<typeof createServerClient>>,
	bookingId: string,
): Promise<BookingAcceptRow | null> {
	const { data, error } = await supabase
		.from('bookings')
		.select(BOOKING_ACCEPT_SELECT)
		.eq('id', bookingId)
		.maybeSingle()
	if (error || !data || typeof data !== 'object') {
		return null
	}
	return data as unknown as BookingAcceptRow
}

async function buildQuoteAcceptedEftViewModel(
	supabase: Awaited<ReturnType<typeof createServerClient>>,
	booking: BookingAcceptRow,
): Promise<QuoteAcceptViewModel> {
	const refLabel = bookingRefLabelFromRow(booking)
	const bank = await loadWalkInQuoteBankContext(supabase, refLabel)
	const supportContactLine = resolveSupportContactLine()
	if (!bank.ok) {
		return {
			kind: 'quote_accepted_eft',
			bookingReferenceLabel: refLabel,
			supportContactLine,
			eft: { load: 'error', message: bank.message },
		}
	}
	return {
		kind: 'quote_accepted_eft',
		bookingReferenceLabel: refLabel,
		supportContactLine,
		eft: {
			load: 'ok',
			paymentReference: bank.paymentReference,
			bankAccount: bank.bankAccount,
		},
	}
}

/**
 * Epic 14 / Story 14.3 — `/q/[token]/accept` server flow: verify token (**accept** purpose),
 * validate state, transition **`quote_sent → awaiting_payment`**, set **`quote_accepted_at`**
 * on first success, then EFT confirmation email once; reload is idempotent.
 * (“Checkout” in the name is legacy naming — there is **no** PayFast/gateway redirect here.)
 */
export async function runQuoteAcceptCheckout(rawToken: string): Promise<QuoteAcceptViewModel> {
	const token = rawToken.trim()
	if (!token) {
		return { kind: 'token', reason: 'malformed' }
	}

	let verified
	try {
		verified = verifyQuoteToken(token, { expectedPurpose: 'accept' })
	} catch {
		return { kind: 'transition_failed', detail: 'Quote link signing is not configured on this server.' }
	}

	if (!verified.valid) {
		if (verified.reason === 'expired') {
			let prefillHref = '/book/search'
			let tripSummary: QuoteExpiredTripSummary | null = null
			if (verified.payload) {
				const supabaseExpired = await createServerClient()
				const row = await loadBookingForAccept(supabaseExpired, verified.payload.bookingId)
				if (row) {
					prefillHref = buildBookSearchPrefillHrefFromBooking(row)
					tripSummary = buildTripSummaryFromBookingRow(row)
				}
			}
			return { kind: 'token_expired', prefillHref, tripSummary }
		}
		if (verified.reason === 'invalid_signature') {
			return { kind: 'token', reason: 'invalid_signature' }
		}
		return { kind: 'token', reason: 'malformed' }
	}

	const { quoteId, bookingId } = verified.payload
	const supabase = await createServerClient()

	const { data: quote, error: qErr } = await supabase
		.from('booking_quotes')
		.select('id, booking_id, status, expires_at')
		.eq('id', quoteId)
		.maybeSingle()

	if (qErr || !quote?.id || quote.booking_id !== bookingId) {
		return { kind: 'not_found' }
	}

	const quoteStatus = quote.status as BookingQuoteStatusDb
	const booking = await loadBookingForAccept(supabase, bookingId)
	if (!booking) {
		return { kind: 'not_found' }
	}

	if (booking.client_type !== 'walk_in') {
		return { kind: 'wrong_client_type' }
	}

	const nowMs = Date.now()
	const expiresAtRaw = quote.expires_at as string | null
	if (quoteStatus === 'sent' && expiresAtRaw) {
		const expMs = new Date(expiresAtRaw).getTime()
		if (!Number.isNaN(expMs) && expMs <= nowMs) {
			return {
				kind: 'token_expired',
				prefillHref: buildBookSearchPrefillHrefFromBooking(booking),
				tripSummary: buildTripSummaryFromBookingRow(booking),
			}
		}
	}

	if (quoteStatus === 'accepted') {
		const ps = booking.payment_status
		const st = booking.status
		if (ps === 'paid' || st === 'paid' || st === 'ready_to_assign' || st === 'assigned' || st === 'in_progress') {
			return { kind: 'already_paid' }
		}
		if (st === 'awaiting_payment') {
			return buildQuoteAcceptedEftViewModel(supabase, booking)
		}
		return { kind: 'already_accepted' }
	}

	if (quoteStatus === 'rejected') {
		return { kind: 'quote_state', variant: 'rejected' }
	}
	if (quoteStatus === 'superseded') {
		return { kind: 'quote_state', variant: 'superseded' }
	}
	if (quoteStatus === 'draft') {
		return { kind: 'quote_state', variant: 'draft' }
	}
	if (quoteStatus === 'expired') {
		return { kind: 'quote_state', variant: 'db_expired' }
	}
	if (quoteStatus !== 'sent') {
		return { kind: 'quote_state', variant: 'not_sent' }
	}

	if (booking.status !== 'quote_sent') {
		return { kind: 'booking_status_mismatch' }
	}

	const refLabel = bookingRefLabelFromRow(booking)
	const bankPre = await loadWalkInQuoteBankContext(supabase, refLabel)
	if (!bankPre.ok) {
		return { kind: 'transition_failed', detail: bankPre.message }
	}

	const dbResult = await acceptSentQuoteInDb(supabase, quoteId, bookingId)
	if (!dbResult.ok) {
		return {
			kind: 'transition_failed',
			detail:
				dbResult.step === 'quote'
					? 'This quote is no longer available for acceptance. It may have been updated — please use the latest link from your email.'
					: 'We could not record acceptance. Please try again or contact support.',
		}
	}

	const refreshed = await loadBookingForAccept(supabase, bookingId)
	if (!refreshed || refreshed.status !== 'awaiting_payment' || !refreshed.quote_accepted_at) {
		return {
			kind: 'transition_failed',
			detail: 'Acceptance could not be confirmed. Please refresh or contact support.',
		}
	}

	await sendWalkInAcceptanceConfirmationForBooking(supabase, {
		booking: {
			...refreshed,
			client_type: refreshed.client_type as 'walk_in' | 'account_client',
		},
		quoteId,
		bank: bankPre,
		bookingRefLabel: refLabel,
	})

	return buildQuoteAcceptedEftViewModel(supabase, refreshed)
}

async function acceptSentQuoteInDb(
	supabase: Awaited<ReturnType<typeof createServerClient>>,
	quoteId: string,
	bookingId: string,
): Promise<{ ok: true } | { ok: false; step: 'quote' | 'booking' }> {
	const now = new Date().toISOString()
	const { data: qRow, error: qErr } = await supabase
		.from('booking_quotes')
		.update({ status: 'accepted', accepted_at: now })
		.eq('id', quoteId)
		.eq('booking_id', bookingId)
		.eq('status', 'sent')
		.select('id')
		.maybeSingle()

	if (qErr || !qRow?.id) {
		return { ok: false, step: 'quote' }
	}

	const { data: bRow, error: bErr } = await supabase
		.from('bookings')
		.update({ status: 'awaiting_payment', quote_accepted_at: now })
		.eq('id', bookingId)
		.eq('status', 'quote_sent')
		.select('id')
		.maybeSingle()

	if (bErr || !bRow?.id) {
		await supabase
			.from('booking_quotes')
			.update({ status: 'sent', accepted_at: null })
			.eq('id', quoteId)
			.eq('status', 'accepted')
		return { ok: false, step: 'booking' }
	}

	return { ok: true }
}
