'use server'

import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import type { BookingTripConfirmationSendRow } from '@/lib/account-trip-confirmation-email-data'
import {
	auditCommsMatrixPreSendBlocked,
	loadCommsEmailMatrixGate,
	sendCommsMatrixEmailDispatches,
	type CommsMatrixEmailSnapshot,
} from '@/lib/comms'
import { BOOKING_TRIP_CONFIRMATION_MAIL_SELECT } from '@/lib/booking-quote-trip-confirmation-email'
import { buildAccountTripConfirmationProps } from '@/lib/account-trip-confirmation-email-data'
import {
	computeNextEmailFailureAttemptCountForQuote,
} from '@/lib/booking-quote-comms-retry'
import { resolveSentToEmailForBooking } from '@/lib/booking-quote-sent-email'
import { renderAccountTripConfirmationHtml } from '@/lib/email/templates/account-trip-confirmation'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { createServiceRoleClient, createUserServerClient } from '@/lib/supabase/server'
import {
	bookingQuoteLineItemsSchema,
	serializeBookingQuoteLineItems,
	type BookingQuoteLineItem,
} from '@/types/booking-quote'
import type { ClientTypeDb } from '@/types/database.types'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_72H = 72 * 60 * 60 * 1000
const CREATE_VERSION_MAX_ATTEMPTS = 12

const createBookingQuoteInputSchema = z.object({
	bookingId: z.string().uuid(),
	lineItems: bookingQuoteLineItemsSchema,
	totalZar: z.number().finite().nonnegative(),
	expiresAt: z.string().datetime().optional().nullable(),
})

const sendBookingQuoteInputSchema = z.object({
	quoteId: z.string().uuid(),
})

const resendBookingQuoteInputSchema = z.object({
	priorQuoteId: z.string().uuid(),
})

function roundMoney2(value: number): number {
	return Math.round(value * 100) / 100
}

function lineItemsTotalSum(lineItems: BookingQuoteLineItem[]): number {
	return roundMoney2(lineItems.reduce((acc, row) => acc + row.total_zar, 0))
}

function defaultExpiresAtIso(clientType: ClientTypeDb): string {
	const ms = clientType === 'account_client' ? 14 * MS_PER_DAY : MS_72H
	return new Date(Date.now() + ms).toISOString()
}

function isPostgresUniqueViolation(message: string, code?: string): boolean {
	if (code === '23505') return true
	return /duplicate key|unique constraint/i.test(message)
}

type RpcSendQuotePayload =
	| { outcome: 'success'; idempotent: boolean }
	| { outcome: 'error'; error: string }

type RpcResendQuotePayload =
	| { outcome: 'success'; newQuoteId: string; newVersion: number }
	| { outcome: 'error'; error: string }

function parseRpcSendQuotePayload(raw: unknown): RpcSendQuotePayload {
	if (!raw || typeof raw !== 'object') {
		return { outcome: 'error', error: 'invalid_response' }
	}
	const o = raw as Record<string, unknown>
	if (o.ok === true) {
		return { outcome: 'success', idempotent: o.idempotent === true }
	}
	if (o.ok === false && typeof o.error === 'string') {
		return { outcome: 'error', error: o.error }
	}
	return { outcome: 'error', error: 'invalid_response' }
}

function parseRpcResendQuotePayload(raw: unknown): RpcResendQuotePayload {
	if (!raw || typeof raw !== 'object') {
		return { outcome: 'error', error: 'invalid_response' }
	}
	const o = raw as Record<string, unknown>
	if (o.ok === true) {
		const newQuoteId = o.new_quote_id
		const newVersion = o.new_version
		if (typeof newQuoteId === 'string' && typeof newVersion === 'number') {
			return { outcome: 'success', newQuoteId, newVersion }
		}
		return { outcome: 'error', error: 'invalid_response' }
	}
	if (o.ok === false && typeof o.error === 'string') {
		return { outcome: 'error', error: o.error }
	}
	return { outcome: 'error', error: 'invalid_response' }
}

export type CreateBookingQuoteResult =
	| { ok: true; quoteId: string; version: number; correlationId: string }
	| ReturnType<typeof buildOpsActionFailure>

export type SendBookingQuoteResult =
	| { ok: true; correlationId: string; idempotent: boolean }
	| ReturnType<typeof buildOpsActionFailure>

export type ResendBookingQuoteResult =
	| { ok: true; newQuoteId: string; newVersion: number; correlationId: string }
	| ReturnType<typeof buildOpsActionFailure>

/**
 * Staff-only: inserts the next `booking_quotes` version for a booking (`draft`, idempotency key).
 */
export async function createBookingQuote(
	bookingId: string,
	lineItems: BookingQuoteLineItem[],
	totalZar: number,
	expiresAt?: string | null,
): Promise<CreateBookingQuoteResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = createBookingQuoteInputSchema.safeParse({
		bookingId,
		lineItems,
		totalZar,
		expiresAt: expiresAt ?? undefined,
	})
	if (!parsed.success) {
		logOpsAction({
			action: 'createBookingQuote',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid quote payload', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'createBookingQuote',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const { bookingId: bId, lineItems: items, totalZar: totalIn, expiresAt: expIn } = parsed.data

	const { data: booking, error: bErr } = await supabase
		.from('bookings')
		.select('id, client_type')
		.eq('id', bId)
		.maybeSingle()

	if (bErr || !booking?.id) {
		logOpsAction({
			action: 'createBookingQuote',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			bookingId: bId,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	const clientType = booking.client_type as ClientTypeDb
	const totalRounded = roundMoney2(totalIn)
	const sumRounded = lineItemsTotalSum(items)
	if (Math.abs(sumRounded - totalRounded) > 0.02) {
		logOpsAction({
			action: 'createBookingQuote',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
			bookingId: bId,
		})
		return buildOpsActionFailure(
			'VALIDATION',
			'Line item totals do not match total_zar',
			correlationId,
			{ reasonCode: 'QUOTE_LINE_TOTAL_MISMATCH' },
		)
	}

	let serialized: unknown
	try {
		serialized = serializeBookingQuoteLineItems(items)
	} catch {
		return buildOpsActionFailure('VALIDATION', 'Invalid line items', correlationId)
	}

	const expiresResolved =
		expIn != null && expIn !== ''
			? expIn
			: defaultExpiresAtIso(clientType)

	for (let attempt = 0; attempt < CREATE_VERSION_MAX_ATTEMPTS; attempt += 1) {
		const { data: maxRow, error: maxErr } = await supabase
			.from('booking_quotes')
			.select('version')
			.eq('booking_id', bId)
			.order('version', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (maxErr) {
			logOpsAction({
				action: 'createBookingQuote',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'DATABASE',
				bookingId: bId,
				hint: maxErr.message,
			})
			return buildOpsActionFailure('DATABASE', maxErr.message, correlationId)
		}

		const nextVersion = (typeof maxRow?.version === 'number' ? maxRow.version : 0) + 1
		const idempotencyKey = `${bId}:${nextVersion}`

		const { data: inserted, error: insErr } = await supabase
			.from('booking_quotes')
			.insert({
				booking_id: bId,
				version: nextVersion,
				total_zar: totalRounded,
				line_items: serialized,
				status: 'draft',
				idempotency_key: idempotencyKey,
				expires_at: expiresResolved,
			})
			.select('id, version')
			.single()

		if (!insErr && inserted?.id) {
			logOpsAction({
				action: 'createBookingQuote',
				outcome: 'success',
				level: 'info',
				correlationId,
				bookingId: bId,
				entityId: inserted.id as string,
				meta: { version: nextVersion },
			})
			return {
				ok: true,
				quoteId: inserted.id as string,
				version: inserted.version as number,
				correlationId,
			}
		}

		const msg = insErr?.message ?? 'Insert failed'
		if (isPostgresUniqueViolation(msg, insErr?.code)) {
			continue
		}

		logOpsAction({
			action: 'createBookingQuote',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId: bId,
			hint: msg,
		})
		return buildOpsActionFailure('DATABASE', msg, correlationId)
	}

	logOpsAction({
		action: 'createBookingQuote',
		outcome: 'conflict',
		level: 'warn',
		correlationId,
		code: 'CONFLICT',
		bookingId: bId,
	})
	return buildOpsActionFailure(
		'CONFLICT',
		'Could not allocate a quote version after concurrent writes. Retry.',
		correlationId,
	)
}

/**
 * Staff-only: `draft → sent`, sets `sent_*` / `sent_by`, `bookings.current_quote_id` (atomic via RPC).
 */
export async function sendBookingQuote(quoteId: string): Promise<SendBookingQuoteResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = sendBookingQuoteInputSchema.safeParse({ quoteId })
	if (!parsed.success) {
		logOpsAction({
			action: 'sendBookingQuote',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid quote id', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'sendBookingQuote',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const qId = parsed.data.quoteId
	const staffUserId = gate.session.userId

	const { data: quoteRow, error: qErr } = await supabase
		.from('booking_quotes')
		.select('id, booking_id, status, line_items, total_zar, rendered_html, idempotency_key')
		.eq('id', qId)
		.maybeSingle()

	if (qErr || !quoteRow?.booking_id) {
		logOpsAction({
			action: 'sendBookingQuote',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			entityId: qId,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Quote not found', correlationId)
	}

	const { data: bookingRaw, error: bErr } = await supabase
		.from('bookings')
		.select(BOOKING_TRIP_CONFIRMATION_MAIL_SELECT)
		.eq('id', quoteRow.booking_id as string)
		.maybeSingle()

	if (
		bErr ||
		bookingRaw == null ||
		typeof bookingRaw !== 'object' ||
		!('id' in bookingRaw) ||
		typeof (bookingRaw as { id?: unknown }).id !== 'string'
	) {
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found for quote', correlationId)
	}

	const booking = bookingRaw as BookingTripConfirmationSendRow

	const quoteStatus = quoteRow.status as string
	const initialStatus = quoteStatus
	const wasDraft = initialStatus === 'draft'
	const storedHtmlRaw = quoteRow.rendered_html
	const hasStoredHtml =
		typeof storedHtmlRaw === 'string' && storedHtmlRaw.trim().length > 0

	let recipientEmail = ''
	if (quoteStatus !== 'sent') {
		const emailRes = await resolveSentToEmailForBooking(supabase, {
			client_type: booking.client_type as ClientTypeDb,
			customer_email: booking.customer_email as string | null,
			customer_id: booking.customer_id as string | null,
			customer_account_id: booking.customer_account_id as string | null,
			account_snapshot: booking.account_snapshot,
		})
		if (!emailRes.ok) {
			logOpsAction({
				action: 'sendBookingQuote',
				outcome: 'validation_error',
				level: 'warn',
				correlationId,
				code: 'VALIDATION',
				bookingId: booking.id as string,
			})
			return buildOpsActionFailure('VALIDATION', emailRes.message, correlationId, {
				reasonCode: 'MISSING_RECIPIENT_EMAIL',
			})
		}
		recipientEmail = emailRes.email
	}

	let accountRow: { credit_terms_days?: number } | null = null
	const acctId = booking.customer_account_id as string | null
	if (acctId) {
		const { data: ca } = await supabase
			.from('customer_accounts')
			.select('credit_terms_days')
			.eq('id', acctId)
			.maybeSingle()
		accountRow = ca as { credit_terms_days?: number } | null
	}

	let renderedHtml: string | null = null
	const mustRenderHtml = !(initialStatus === 'sent' && hasStoredHtml)
	if (mustRenderHtml) {
		const props = await buildAccountTripConfirmationProps({
			supabase,
			booking,
			lineItemsRaw: quoteRow.line_items,
			totalZar: quoteRow.total_zar as number,
			accountRow,
		})
		renderedHtml = renderAccountTripConfirmationHtml(props)
	}

	const commsEventKey =
		(booking.client_type as ClientTypeDb) === 'walk_in'
			? ('quote_sent_walk_in' as const)
			: ('quote_sent_account' as const)

	let matrixSnapshot: CommsMatrixEmailSnapshot | null = null
	if (wasDraft) {
		const serviceSb = await createServiceRoleClient()
		const gate = await loadCommsEmailMatrixGate(serviceSb, commsEventKey, 'email')
		if (!gate.ok) {
			await auditCommsMatrixPreSendBlocked({
				userSupabase: supabase,
				serviceSupabase: serviceSb,
				staffActorId: staffUserId,
				kind: gate.kind,
				entity: 'booking',
				entityId: booking.id as string,
				eventKey: commsEventKey,
				channel: 'email',
				bookingId: booking.id as string,
				quoteId: qId,
				correlationId,
			})
			return buildOpsActionFailure(
				'VALIDATION',
				gate.kind === 'no_rules'
					? 'No active comms dispatch rules for this quote email. Add rules under Operations → Comms registry (/ops/comms), or apply migration repair_comms_dispatch_rules_default_seed.'
					: 'No active comms template for this quote email. Add templates under Operations → Comms registry (/ops/comms).',
				correlationId,
				{ reasonCode: 'COMMS_MATRIX_NOT_CONFIGURED' },
			)
		}
		matrixSnapshot = gate.snapshot
	}

	const rpcArgs: {
		p_quote_id: string
		p_sent_to_email: string
		p_rendered_html?: string | null
	} = {
		p_quote_id: qId,
		p_sent_to_email: recipientEmail || 'idempotent@invalid',
	}
	if (renderedHtml !== null && renderedHtml.trim() !== '') {
		rpcArgs.p_rendered_html = renderedHtml
	}

	const { data: rpcRaw, error: rpcErr } = await supabase.rpc(
		'ops_send_booking_quote_v1',
		rpcArgs,
	)

	if (rpcErr) {
		logOpsAction({
			action: 'sendBookingQuote',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: qId,
			hint: rpcErr.message,
		})
		return buildOpsActionFailure('DATABASE', rpcErr.message, correlationId)
	}

	const rpc = parseRpcSendQuotePayload(rpcRaw)
	if (rpc.outcome === 'error') {
		if (rpc.error === 'booking_not_sendable') {
			return buildOpsActionFailure(
				'VALIDATION',
				'Quotes cannot be sent for cancelled or expired bookings.',
				correlationId,
				{ reasonCode: 'BOOKING_NOT_SENDABLE' },
			)
		}
		if (rpc.error === 'invalid_quote_state') {
			return buildOpsActionFailure(
				'VALIDATION',
				'Only draft quotes can be sent.',
				correlationId,
				{ reasonCode: 'QUOTE_NOT_DRAFT' },
			)
		}
		if (rpc.error === 'forbidden') {
			return buildOpsActionFailure('FORBIDDEN', 'Forbidden', correlationId)
		}
		if (rpc.error === 'quote_not_found') {
			return buildOpsActionFailure('NOT_FOUND', 'Quote not found', correlationId)
		}
		return buildOpsActionFailure('DATABASE', 'Quote send failed', correlationId)
	}

	const isIdempotent = rpc.idempotent === true

	const shouldSendCustomerEmail = wasDraft && !isIdempotent

	if (shouldSendCustomerEmail) {
		const htmlBody = renderedHtml ?? ''
		if (htmlBody.trim() === '') {
			logOpsAction({
				action: 'sendBookingQuote',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'DATABASE',
				entityId: qId,
				bookingId: quoteRow.booking_id as string,
				hint: 'missing_rendered_html',
			})
			return buildOpsActionFailure(
				'DATABASE',
				'Could not prepare trip confirmation email.',
				correlationId,
			)
		}

		const bookingRef =
			booking.payment_reference != null && String(booking.payment_reference).trim() !== ''
				? String(booking.payment_reference).trim()
				: (booking.id as string)
		const subject = `Trip confirmation and quote · ${bookingRef}`

		const idemKeyRaw =
			typeof quoteRow.idempotency_key === 'string' && quoteRow.idempotency_key.trim() !== ''
				? `trip-confirmation-send:${quoteRow.idempotency_key.trim()}`
				: `trip-confirmation-send:${qId}`
		const idempotencyKey =
			idemKeyRaw.length > 256 ? idemKeyRaw.slice(0, 256) : idemKeyRaw

		if (!matrixSnapshot) {
			return buildOpsActionFailure('DATABASE', 'Comms matrix state missing for send.', correlationId)
		}

		const serviceSb = await createServiceRoleClient()
		const sendResult = await sendCommsMatrixEmailDispatches({
			serviceSupabase: serviceSb,
			userSupabase: supabase,
			staffActorId: staffUserId,
			eventKey: commsEventKey,
			channel: 'email',
			entity: 'booking',
			entityId: booking.id as string,
			correlationId,
			bookingId: booking.id as string,
			quoteId: qId,
			booking: {
				client_type: booking.client_type as ClientTypeDb,
				customer_email: booking.customer_email as string | null,
				customer_id: booking.customer_id as string | null,
				customer_account_id: booking.customer_account_id as string | null,
				account_snapshot: booking.account_snapshot,
				rider_email: booking.rider_email as string | null | undefined,
			},
			bookingRefLabel: bookingRef,
			snapshot: matrixSnapshot,
			getFallbackEmail: async () => ({ subject, html: htmlBody }),
			baseIdempotencyKey: idempotencyKey,
		})

		if (sendResult.outcome === 'no_recipients') {
			const errMsg = 'No comms recipients resolved for configured dispatch rules.'
			logOpsAction({
				action: 'sendBookingQuote',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'VALIDATION',
				entityId: qId,
				bookingId: quoteRow.booking_id as string,
				hint: errMsg,
			})
			return buildOpsActionFailure('VALIDATION', errMsg, correlationId, {
				reasonCode: 'COMMS_MATRIX_NO_RECIPIENTS',
			})
		}

		if (sendResult.outcome === 'failed') {
			const errMsg = sendResult.message
			logOpsAction({
				action: 'sendBookingQuote',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'EMAIL',
				entityId: qId,
				bookingId: quoteRow.booking_id as string,
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
				console.error('[vestroo:ops] appendOpsAuditLog email_send_failed failed:', audit.message)
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
				comms_event_key: commsEventKey,
				comms_send_count: sendResult.outcome === 'sent' ? sendResult.sendCount : 0,
			},
		})
		if (!sentAudit.ok) {
			console.error('[vestroo:ops] appendOpsAuditLog email_sent failed:', sentAudit.message)
		}

		logOpsAction({
			action: 'sendBookingQuote',
			outcome: 'success',
			level: 'info',
			correlationId,
			entityId: qId,
			bookingId: quoteRow.booking_id as string,
			meta: {
				idempotent: false,
				emailMode: 'sent',
			},
		})

		return { ok: true, correlationId, idempotent: false }
	}

	logOpsAction({
		action: 'sendBookingQuote',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: qId,
		bookingId: quoteRow.booking_id as string,
		meta: { idempotent: isIdempotent },
	})

	return { ok: true, correlationId, idempotent: isIdempotent }
}

/**
 * Staff-only: new quote version from prior sent/accepted quote, supersede prior, send new row,
 * set `bookings.current_quote_id` — atomic via `ops_resend_booking_quote_v1`.
 */
export async function resendBookingQuote(priorQuoteId: string): Promise<ResendBookingQuoteResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = resendBookingQuoteInputSchema.safeParse({ priorQuoteId })
	if (!parsed.success) {
		logOpsAction({
			action: 'resendBookingQuote',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid quote id', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'resendBookingQuote',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const qPrior = parsed.data.priorQuoteId

	const { data: rpcRaw, error: rpcErr } = await supabase.rpc('ops_resend_booking_quote_v1', {
		p_prior_quote_id: qPrior,
	})

	if (rpcErr) {
		logOpsAction({
			action: 'resendBookingQuote',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: qPrior,
			hint: rpcErr.message,
		})
		return buildOpsActionFailure('DATABASE', rpcErr.message, correlationId)
	}

	const rpc = parseRpcResendQuotePayload(rpcRaw)
	if (rpc.outcome === 'error') {
		if (rpc.error === 'forbidden') {
			return buildOpsActionFailure('FORBIDDEN', 'Forbidden', correlationId)
		}
		if (rpc.error === 'quote_not_found') {
			return buildOpsActionFailure('NOT_FOUND', 'Quote not found', correlationId)
		}
		if (rpc.error === 'booking_not_found') {
			return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
		}
		if (rpc.error === 'invalid_quote_state') {
			return buildOpsActionFailure(
				'VALIDATION',
				'Only sent or accepted quotes can be re-sent.',
				correlationId,
				{ reasonCode: 'QUOTE_NOT_RESENDABLE' },
			)
		}
		if (rpc.error === 'invalid_email') {
			return buildOpsActionFailure(
				'VALIDATION',
				'Prior quote has no recipient email.',
				correlationId,
				{ reasonCode: 'MISSING_RECIPIENT_EMAIL' },
			)
		}
		if (rpc.error === 'booking_not_sendable') {
			return buildOpsActionFailure(
				'VALIDATION',
				'Quotes cannot be sent for cancelled or expired bookings.',
				correlationId,
				{ reasonCode: 'BOOKING_NOT_SENDABLE' },
			)
		}
		if (rpc.error === 'version_conflict') {
			return buildOpsActionFailure(
				'CONFLICT',
				'Could not allocate a quote version after concurrent writes. Retry.',
				correlationId,
			)
		}
		return buildOpsActionFailure('DATABASE', 'Re-send failed', correlationId)
	}

	logOpsAction({
		action: 'resendBookingQuote',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: rpc.newQuoteId,
		meta: { priorQuoteId: qPrior, newVersion: rpc.newVersion },
	})

	return {
		ok: true,
		newQuoteId: rpc.newQuoteId,
		newVersion: rpc.newVersion,
		correlationId,
	}
}
