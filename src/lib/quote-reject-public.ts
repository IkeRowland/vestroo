import { appendOpsAuditLog } from '@/lib/ops-audit'
import { buildBookSearchPrefillHrefFromBooking } from '@/lib/quote-accept-prefill'
import { resolveQuoteLinkOpsAuditActorId } from '@/lib/resolve-quote-link-audit-actor'
import { createServerClient } from '@/lib/supabase/server'
import { signQuoteTokenWithPurpose, verifyQuoteToken } from '@/lib/quote-tokens'
import type { BookingQuoteStatusDb } from '@/types/database.types'

export type QuoteRejectGetViewModel =
	| {
			kind: 'form'
			token: string
			acceptHref: string
	  }
	| {
			kind: 'quote_state'
			variant: 'accepted' | 'rejected' | 'superseded' | 'draft' | 'db_expired' | 'not_sent'
	  }
	| { kind: 'token'; reason: 'invalid_signature' | 'malformed' }
	| { kind: 'token_expired'; prefillHref: string }
	| { kind: 'not_found' }
	| { kind: 'wrong_client_type' }
	| { kind: 'booking_status_mismatch' }

type BookingRow = {
	id: string
	status: string
	payment_status: string
	client_type: string
	customer_id: string | null
	origin_address: string | null
	destination_address: string | null
	passenger_count: number | null
	pickup_datetime: string | null
	booking_intent: string | null
}

async function loadBooking(
	supabase: Awaited<ReturnType<typeof createServerClient>>,
	bookingId: string,
): Promise<BookingRow | null> {
	const { data, error } = await supabase
		.from('bookings')
		.select(
			'id, status, payment_status, client_type, customer_id, origin_address, destination_address, passenger_count, pickup_datetime, booking_intent',
		)
		.eq('id', bookingId)
		.maybeSingle()
	if (error || !data || typeof data !== 'object') {
		return null
	}
	return data as unknown as BookingRow
}

export async function runQuoteRejectGet(rawToken: string): Promise<QuoteRejectGetViewModel> {
	const token = rawToken.trim()
	if (!token) {
		return { kind: 'token', reason: 'malformed' }
	}

	let verified
	try {
		verified = verifyQuoteToken(token, { expectedPurpose: 'reject' })
	} catch {
		return { kind: 'token', reason: 'malformed' }
	}

	if (!verified.valid) {
		if (verified.reason === 'expired') {
			let prefillHref = '/book/search'
			if (verified.payload) {
				const supabase = await createServerClient()
				const row = await loadBooking(supabase, verified.payload.bookingId)
				if (row) {
					prefillHref = buildBookSearchPrefillHrefFromBooking(row)
				}
			}
			return { kind: 'token_expired', prefillHref }
		}
		if (verified.reason === 'invalid_signature') {
			return { kind: 'token', reason: 'invalid_signature' }
		}
		return { kind: 'token', reason: 'malformed' }
	}

	const { quoteId, bookingId, exp } = verified.payload
	const supabase = await createServerClient()

	const { data: quote, error: qErr } = await supabase
		.from('booking_quotes')
		.select('id, booking_id, status, expires_at')
		.eq('id', quoteId)
		.maybeSingle()

	if (qErr || !quote?.id || quote.booking_id !== bookingId) {
		return { kind: 'not_found' }
	}

	const booking = await loadBooking(supabase, bookingId)
	if (!booking) {
		return { kind: 'not_found' }
	}

	if (booking.client_type !== 'walk_in') {
		return { kind: 'wrong_client_type' }
	}

	const quoteStatus = quote.status as BookingQuoteStatusDb
	const nowMs = Date.now()
	const expiresAtRaw = quote.expires_at as string | null
	if (quoteStatus === 'sent' && expiresAtRaw) {
		const expMs = new Date(expiresAtRaw).getTime()
		if (!Number.isNaN(expMs) && expMs <= nowMs) {
			return { kind: 'token_expired', prefillHref: buildBookSearchPrefillHrefFromBooking(booking) }
		}
	}

	if (quoteStatus === 'accepted') {
		return { kind: 'quote_state', variant: 'accepted' }
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

	const acceptToken = signQuoteTokenWithPurpose(
		{ quoteId, bookingId, exp },
		'accept',
	)
	const acceptHref = `/q/${encodeURIComponent(acceptToken)}/accept`

	return { kind: 'form', token, acceptHref }
}

export type QuoteRejectSubmitResult =
	| { ok: true }
	| { ok: false; error: 'invalid' | 'server' | 'not_sent' }

function normalizeReason(raw: string): string | null {
	const t = raw.trim()
	if (t.length === 0) {
		return null
	}
	return t.length > 2000 ? t.slice(0, 2000) : t
}

/**
 * POST handler: **`sent → rejected`**, booking **`quote_sent → triaged`**, **`ops_audit_log`**.
 * Idempotent: if quote is already **`rejected`**, returns **`{ ok: true }`** without duplicate audit.
 */
export async function runPublicQuoteRejectSubmit(
	rawToken: string,
	reasonRaw: string,
): Promise<QuoteRejectSubmitResult> {
	const token = rawToken.trim()
	if (!token) {
		return { ok: false, error: 'invalid' }
	}

	const reason = normalizeReason(reasonRaw)

	let verified
	try {
		verified = verifyQuoteToken(token, { expectedPurpose: 'reject' })
	} catch {
		return { ok: false, error: 'server' }
	}

	if (!verified.valid) {
		return { ok: false, error: 'invalid' }
	}

	const { quoteId, bookingId } = verified.payload
	const supabase = await createServerClient()

	const { data: quote, error: qErr } = await supabase
		.from('booking_quotes')
		.select('id, booking_id, status')
		.eq('id', quoteId)
		.maybeSingle()

	if (qErr || !quote?.id || quote.booking_id !== bookingId) {
		return { ok: false, error: 'invalid' }
	}

	const quoteStatus = quote.status as BookingQuoteStatusDb
	if (quoteStatus === 'rejected') {
		return { ok: true }
	}
	if (quoteStatus !== 'sent') {
		return { ok: false, error: 'not_sent' }
	}

	const booking = await loadBooking(supabase, bookingId)
	if (!booking || booking.client_type !== 'walk_in' || booking.status !== 'quote_sent') {
		return { ok: false, error: 'invalid' }
	}

	const now = new Date().toISOString()
	const { data: qRow, error: quErr } = await supabase
		.from('booking_quotes')
		.update({
			status: 'rejected',
			rejection_reason: reason,
			rejected_at: now,
		})
		.eq('id', quoteId)
		.eq('booking_id', bookingId)
		.eq('status', 'sent')
		.select('id')
		.maybeSingle()

	if (quErr || !qRow?.id) {
		const { data: again } = await supabase
			.from('booking_quotes')
			.select('status')
			.eq('id', quoteId)
			.maybeSingle()
		if ((again?.status as string | undefined) === 'rejected') {
			return { ok: true }
		}
		return { ok: false, error: 'server' }
	}

	const { data: bRow, error: bErr } = await supabase
		.from('bookings')
		.update({ status: 'triaged' })
		.eq('id', bookingId)
		.eq('status', 'quote_sent')
		.select('id')
		.maybeSingle()

	if (bErr || !bRow?.id) {
		await supabase
			.from('booking_quotes')
			.update({
				status: 'sent',
				rejection_reason: null,
				rejected_at: null,
			})
			.eq('id', quoteId)
			.eq('status', 'rejected')
		return { ok: false, error: 'server' }
	}

	const actor = await resolveQuoteLinkOpsAuditActorId(supabase)
	if (!actor.ok) {
		console.error('[quote-reject] resolveQuoteLinkOpsAuditActorId failed:', actor.message)
		return { ok: true }
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: actor.actorId,
		actorRole: 'customer',
		action: 'customer_rejected_quote',
		entity: 'booking_quotes',
		entityId: quoteId,
		payload: {
			booking_id: bookingId,
			quote_id: quoteId,
			rejection_reason: reason,
			...(booking.customer_id ? { booking_customer_id: booking.customer_id } : {}),
		},
	})
	if (!audit.ok) {
		// Do not roll back customer-visible rejection; ops can reconcile from booking/quote state.
		console.error('[quote-reject] appendOpsAuditLog failed:', audit.message)
	}

	return { ok: true }
}
