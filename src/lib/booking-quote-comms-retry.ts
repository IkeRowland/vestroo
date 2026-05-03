import type { SupabaseClient } from '@supabase/supabase-js'

/** Row shape returned by `ops_list_booking_quote_comms_retry_candidates_v1`. */
export type BookingQuoteCommsRetryCandidateRow = {
	quote_id: string
	booking_id: string
	sent_to_email: string | null
	quote_version: number
	failure_strike_count: number
	last_email_send_failed_at: string | null
	last_email_sent_at: string | null
}

export type QuoteCommsAuditEvent = {
	action: string
	createdAt: string
}

function maxIsoOrNull(events: QuoteCommsAuditEvent[], action: string): string | null {
	let best: string | null = null
	for (const e of events) {
		if (e.action !== action) continue
		if (best === null || e.createdAt > best) {
			best = e.createdAt
		}
	}
	return best
}

/**
 * Counts `email_send_failed` rows strictly after the latest `email_sent` timestamp
 * (matches SQL `failure_strike_count` in `ops_list_booking_quote_comms_retry_candidates_v1`).
 */
export function countEmailSendFailedSinceLastEmailSent(events: QuoteCommsAuditEvent[]): number {
	const lastSent = maxIsoOrNull(events, 'email_sent')
	let n = 0
	for (const e of events) {
		if (e.action !== 'email_send_failed') continue
		if (lastSent === null || e.createdAt > lastSent) {
			n += 1
		}
	}
	return n
}

function auditTs(iso: string | null): number {
	if (iso === null) return Number.NEGATIVE_INFINITY
	return Date.parse(iso)
}

/**
 * Pure mirror of the SQL retry-candidate predicate (for unit tests).
 * `renderedHtmlMissing` reflects `booking_quotes.rendered_html is null`.
 */
export function bookingQuoteIsCommsRetryCandidateFromAudits(input: {
	renderedHtmlMissing: boolean
	events: QuoteCommsAuditEvent[]
}): boolean {
	const { renderedHtmlMissing, events } = input
	const lastSent = maxIsoOrNull(events, 'email_sent')
	const lastFail = maxIsoOrNull(events, 'email_send_failed')
	const lastAbandon = maxIsoOrNull(events, 'email_retry_abandoned')

	if (auditTs(lastAbandon) > auditTs(lastFail)) {
		return false
	}

	const orderingGap = lastFail !== null && (lastSent === null || lastFail > lastSent)
	return renderedHtmlMissing || orderingGap
}

/** After this many `email_send_failed` rows since last `email_sent`, show manual-exit UX. */
export const COMMS_RETRY_MANUAL_EXIT_STRIKE_THRESHOLD = 3

export function shouldShowCommsRetryStrikeWarning(failureStrikeCount: number): boolean {
	return failureStrikeCount >= COMMS_RETRY_MANUAL_EXIT_STRIKE_THRESHOLD
}

export function buildTripConfirmationRetryResendIdempotencyKey(input: {
	quoteId: string
	latestEmailSendFailedAt: string | null
}): string {
	const wave = input.latestEmailSendFailedAt ?? 'no-email-send-failed'
	const raw = `trip-confirmation-retry:${input.quoteId}:${wave}`
	return raw.length <= 256 ? raw : raw.slice(0, 256)
}

export async function fetchBookingQuoteCommsRetryCandidates(
	supabase: SupabaseClient,
): Promise<{ ok: true; rows: BookingQuoteCommsRetryCandidateRow[] } | { ok: false; message: string }> {
	const { data, error } = await supabase.rpc('ops_list_booking_quote_comms_retry_candidates_v1')
	if (error) {
		return { ok: false, message: error.message }
	}
	const rows = (data ?? []) as unknown as BookingQuoteCommsRetryCandidateRow[]
	return { ok: true, rows }
}

export async function computeNextEmailFailureAttemptCountForQuote(
	supabase: SupabaseClient,
	quoteId: string,
): Promise<{ ok: true; attemptCount: number } | { ok: false; message: string }> {
	const { data: sentRows, error: sentErr } = await supabase
		.from('ops_audit_log')
		.select('created_at')
		.eq('entity', 'booking_quotes')
		.eq('entity_id', quoteId)
		.eq('action', 'email_sent')
		.order('created_at', { ascending: false })
		.limit(1)

	if (sentErr) {
		return { ok: false, message: sentErr.message }
	}
	const lastSentAt =
		Array.isArray(sentRows) && sentRows[0] && typeof sentRows[0].created_at === 'string'
			? sentRows[0].created_at
			: null

	let failQuery = supabase
		.from('ops_audit_log')
		.select('id', { count: 'exact', head: true })
		.eq('entity', 'booking_quotes')
		.eq('entity_id', quoteId)
		.eq('action', 'email_send_failed')

	if (lastSentAt !== null) {
		failQuery = failQuery.gt('created_at', lastSentAt)
	}

	const { count, error: failErr } = await failQuery
	if (failErr) {
		return { ok: false, message: failErr.message }
	}
	return { ok: true, attemptCount: (count ?? 0) + 1 }
}
