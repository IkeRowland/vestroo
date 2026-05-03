'use server'

import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import {
	buildTripConfirmationRetryResendIdempotencyKey,
	computeNextEmailFailureAttemptCountForQuote,
	fetchBookingQuoteCommsRetryCandidates,
} from '@/lib/booking-quote-comms-retry'
import {
	auditCommsMatrixPreSendBlocked,
	loadCommsEmailMatrixGate,
	sendCommsMatrixEmailDispatches,
} from '@/lib/comms'
import {
	buildTripConfirmationEmailSubject,
	loadBookingRowForTripConfirmationEmail,
	maybeBackfillQuoteRenderedHtml,
	resolveRenderedTripConfirmationHtmlForSentQuote,
} from '@/lib/booking-quote-trip-confirmation-email'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { createServiceRoleClient, createUserServerClient } from '@/lib/supabase/server'
import type { ClientTypeDb } from '@/types/database.types'

const quoteIdSchema = z.object({
	quoteId: z.string().uuid(),
})

export type RetrySendBookingQuoteEmailResult =
	| { ok: true; correlationId: string; idempotent: boolean }
	| ReturnType<typeof buildOpsActionFailure>

export type AbandonBookingQuoteCommsRetryResult =
	| { ok: true; correlationId: string }
	| ReturnType<typeof buildOpsActionFailure>

/**
 * Staff-only: resend account trip confirmation for a **sent** quote (Q9 — never rolls back `sent`).
 * Idempotent: Resend `Idempotency-Key` per latest failure wave + short-circuit when the quote
 * no longer matches the comms-retry candidate predicate.
 */
export async function retrySendBookingQuoteEmail(
	quoteId: string,
): Promise<RetrySendBookingQuoteEmailResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = quoteIdSchema.safeParse({ quoteId })
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid quote id', correlationId)
	}

	const staffGate = await getOpsStaffForAction()
	if (!staffGate.ok) {
		return buildOpsActionFailure('FORBIDDEN', staffGate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const qId = parsed.data.quoteId
	const staffUserId = staffGate.session.userId

	const list = await fetchBookingQuoteCommsRetryCandidates(supabase)
	if (!list.ok) {
		return buildOpsActionFailure('DATABASE', list.message, correlationId)
	}
	const stillCandidate = list.rows.some((r) => r.quote_id === qId)
	if (!stillCandidate) {
		logOpsAction({
			action: 'retrySendBookingQuoteEmail',
			outcome: 'success',
			level: 'info',
			correlationId,
			entityId: qId,
			meta: { idempotent: true, reason: 'not_in_retry_queue' },
		})
		return { ok: true, correlationId, idempotent: true }
	}

	const { data: quoteRow, error: qErr } = await supabase
		.from('booking_quotes')
		.select('id, booking_id, status, line_items, total_zar, rendered_html, sent_to_email')
		.eq('id', qId)
		.maybeSingle()

	if (qErr || !quoteRow?.booking_id) {
		return buildOpsActionFailure('NOT_FOUND', 'Quote not found', correlationId)
	}

	if ((quoteRow.status as string) !== 'sent') {
		return buildOpsActionFailure(
			'VALIDATION',
			'Only sent quotes can use comms retry.',
			correlationId,
			{ reasonCode: 'QUOTE_NOT_SENT' },
		)
	}

	const sentTo = typeof quoteRow.sent_to_email === 'string' ? quoteRow.sent_to_email.trim() : ''
	if (sentTo === '') {
		return buildOpsActionFailure(
			'VALIDATION',
			'Quote has no stored recipient email.',
			correlationId,
			{ reasonCode: 'MISSING_RECIPIENT_EMAIL' },
		)
	}

	const bookingRes = await loadBookingRowForTripConfirmationEmail(
		supabase,
		quoteRow.booking_id as string,
	)
	if (!bookingRes.ok) {
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found for quote', correlationId)
	}

	const htmlRes = await resolveRenderedTripConfirmationHtmlForSentQuote({
		supabase,
		booking: bookingRes.booking,
		quoteRow: {
			line_items: quoteRow.line_items,
			total_zar: quoteRow.total_zar as number,
			rendered_html: quoteRow.rendered_html as string | null,
		},
	})
	if (!htmlRes.ok) {
		return buildOpsActionFailure(
			'DATABASE',
			'Could not prepare trip confirmation email.',
			correlationId,
		)
	}

	const backfill = await maybeBackfillQuoteRenderedHtml({
		supabase,
		quoteId: qId,
		html: htmlRes.html,
	})
	if (!backfill.ok) {
		logOpsAction({
			action: 'retrySendBookingQuoteEmail',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			entityId: qId,
			hint: backfill.message,
		})
	}

	const rowMeta = list.rows.find((r) => r.quote_id === qId)
	const latestFailIso = rowMeta?.last_email_send_failed_at ?? null
	const resendKey = buildTripConfirmationRetryResendIdempotencyKey({
		quoteId: qId,
		latestEmailSendFailedAt: latestFailIso,
	})

	const subject = buildTripConfirmationEmailSubject(bookingRes.booking)
	const commsEventKey =
		(bookingRes.booking.client_type as ClientTypeDb) === 'walk_in'
			? ('quote_sent_walk_in' as const)
			: ('quote_sent_account' as const)

	const serviceSb = await createServiceRoleClient()
	const matrixGate = await loadCommsEmailMatrixGate(serviceSb, commsEventKey, 'email')
	if (!matrixGate.ok) {
		await auditCommsMatrixPreSendBlocked({
			userSupabase: supabase,
			serviceSupabase: serviceSb,
			staffActorId: staffUserId,
			kind: matrixGate.kind,
			entity: 'booking',
			entityId: bookingRes.booking.id as string,
			eventKey: commsEventKey,
			channel: 'email',
			bookingId: bookingRes.booking.id as string,
			quoteId: qId,
			correlationId,
		})
		logOpsAction({
			action: 'retrySendBookingQuoteEmail',
			outcome: 'success',
			level: 'info',
			correlationId,
			entityId: qId,
			meta: { idempotent: true, reason: 'comms_matrix_not_configured', kind: matrixGate.kind },
		})
		return { ok: true, correlationId, idempotent: true }
	}

	const sendResult = await sendCommsMatrixEmailDispatches({
		serviceSupabase: serviceSb,
		userSupabase: supabase,
		staffActorId: staffUserId,
		eventKey: commsEventKey,
		channel: 'email',
		entity: 'booking',
		entityId: bookingRes.booking.id as string,
		correlationId,
		bookingId: bookingRes.booking.id as string,
		quoteId: qId,
		booking: {
			client_type: bookingRes.booking.client_type as ClientTypeDb,
			customer_email: bookingRes.booking.customer_email as string | null,
			customer_id: bookingRes.booking.customer_id as string | null,
			customer_account_id: bookingRes.booking.customer_account_id as string | null,
			account_snapshot: bookingRes.booking.account_snapshot,
			rider_email: bookingRes.booking.rider_email as string | null | undefined,
		},
		bookingRefLabel:
			bookingRes.booking.payment_reference != null &&
			String(bookingRes.booking.payment_reference).trim() !== ''
				? String(bookingRes.booking.payment_reference).trim()
				: (bookingRes.booking.id as string),
		snapshot: matrixGate.snapshot,
		getFallbackEmail: async () => ({ subject, html: htmlRes.html }),
		baseIdempotencyKey: resendKey,
	})

	if (sendResult.outcome === 'no_recipients') {
		logOpsAction({
			action: 'retrySendBookingQuoteEmail',
			outcome: 'success',
			level: 'info',
			correlationId,
			entityId: qId,
			meta: { idempotent: true, reason: 'comms_matrix_no_recipients' },
		})
		return { ok: true, correlationId, idempotent: true }
	}

	if (sendResult.outcome === 'failed') {
		const errMsg = sendResult.message
		logOpsAction({
			action: 'retrySendBookingQuoteEmail',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'EMAIL',
			entityId: qId,
			hint: errMsg,
		})

		const attemptRes = await computeNextEmailFailureAttemptCountForQuote(supabase, qId)
		const attemptCount = attemptRes.ok ? attemptRes.attemptCount : 1

		const audit = await appendOpsAuditLog(supabase, {
			actorId: staffUserId,
			action: 'email_send_failed',
			entity: 'booking_quotes',
			entityId: qId,
			payload: {
				quote_id: qId,
				error_message: errMsg,
				attempt_count: attemptCount,
			},
		})
		if (!audit.ok) {
			console.error('[vestroo:ops] appendOpsAuditLog email_send_failed (retry) failed:', audit.message)
		}

		return buildOpsActionFailure('EMAIL', errMsg, correlationId, {
			reasonCode: 'EMAIL_SEND_FAILED',
		})
	}

	const sentAudit = await appendOpsAuditLog(supabase, {
		actorId: staffUserId,
		action: 'email_sent',
		entity: 'booking_quotes',
		entityId: qId,
		payload: {
			quote_id: qId,
			mode: 'sent',
			source: 'retry_panel',
			comms_event_key: commsEventKey,
			comms_send_count: sendResult.outcome === 'sent' ? sendResult.sendCount : 0,
		},
	})
	if (!sentAudit.ok) {
		console.error('[vestroo:ops] appendOpsAuditLog email_sent (retry) failed:', sentAudit.message)
	}

	logOpsAction({
		action: 'retrySendBookingQuoteEmail',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: qId,
		meta: { emailMode: 'sent' },
	})

	return { ok: true, correlationId, idempotent: false }
}

/**
 * Staff-only: manual exit from the comms-retry queue (audit-only; quote stays `sent`).
 */
export async function abandonBookingQuoteCommsRetry(
	quoteId: string,
): Promise<AbandonBookingQuoteCommsRetryResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = quoteIdSchema.safeParse({ quoteId })
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid quote id', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const qId = parsed.data.quoteId
	const staffUserId = gate.session.userId

	const { data: quoteRow, error: qErr } = await supabase
		.from('booking_quotes')
		.select('id, status')
		.eq('id', qId)
		.maybeSingle()

	if (qErr || !quoteRow?.id) {
		return buildOpsActionFailure('NOT_FOUND', 'Quote not found', correlationId)
	}

	if ((quoteRow.status as string) !== 'sent') {
		return buildOpsActionFailure(
			'VALIDATION',
			'Only sent quotes support comms retry actions.',
			correlationId,
			{ reasonCode: 'QUOTE_NOT_SENT' },
		)
	}

	const listGate = await fetchBookingQuoteCommsRetryCandidates(supabase)
	if (!listGate.ok) {
		return buildOpsActionFailure('DATABASE', listGate.message, correlationId)
	}
	const onRetryQueue = listGate.rows.some((r) => r.quote_id === qId)
	if (!onRetryQueue) {
		return buildOpsActionFailure(
			'VALIDATION',
			'Quote is not in the comms retry queue.',
			correlationId,
			{ reasonCode: 'QUOTE_NOT_IN_COMMS_RETRY_QUEUE' },
		)
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: staffUserId,
		action: 'email_retry_abandoned',
		entity: 'booking_quotes',
		entityId: qId,
		payload: { quote_id: qId },
	})
	if (!audit.ok) {
		return buildOpsActionFailure('DATABASE', audit.message, correlationId)
	}

	logOpsAction({
		action: 'abandonBookingQuoteCommsRetry',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: qId,
	})

	return { ok: true, correlationId }
}
