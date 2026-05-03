'use server'

import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { createBookingQuote } from '@/actions/bookingQuoteOps'
import {
	computeNextEmailFailureAttemptCountForQuote,
} from '@/lib/booking-quote-comms-retry'
import {
	auditCommsMatrixPreSendBlocked,
	loadCommsEmailMatrixGate,
	sendCommsMatrixEmailDispatches,
	type CommsMatrixEmailSnapshot,
} from '@/lib/comms'
import { resolveSentToEmailForBooking } from '@/lib/booking-quote-sent-email'
import { resolveSupportContactLine } from '@/lib/email/email-copy'
import {
	buildWalkInQuoteEmailSubject,
	renderWalkInQuoteHtml,
	type WalkInQuoteEmailProps,
} from '@/lib/email/templates/walk-in-quote'
import { loadWalkInQuoteBankContext } from '@/lib/email/walk-in-quote-bank-context'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { quoteTokenExpiryMsFromExpiresAtIso, signQuoteToken } from '@/lib/quote-tokens'
import { createServiceRoleClient, createUserServerClient } from '@/lib/supabase/server'
import { bookingQuoteLineItemsSchema, type BookingQuoteLineItem } from '@/types/booking-quote'
import type { ClientTypeDb } from '@/types/database.types'

const sendWalkInQuoteInputSchema = z.object({
	bookingId: z.string().uuid(),
	lineItems: bookingQuoteLineItemsSchema,
})

function roundMoney2(value: number): number {
	return Math.round(value * 100) / 100
}

function lineItemsTotalSum(lineItems: BookingQuoteLineItem[]): number {
	return roundMoney2(lineItems.reduce((acc, row) => acc + row.total_zar, 0))
}

const BOOKING_WALK_IN_QUOTE_SELECT =
	'id, status, client_type, customer_email, customer_id, customer_account_id, account_snapshot, ' +
	'rider_email, ' +
	'payment_reference, pickup_datetime, origin_name, destination_name, customer_name, passenger_count, ' +
	'booking_trips (' +
	'sort_order, ' +
	'trips (' +
	'id, ' +
	'vehicles ( name, vehicle_categories ( name ) )' +
	')' +
	')'

type TripLink = { sort_order: number | null; trips: unknown }
type TripNested = { vehicles?: unknown }
type VehicleNested = { name?: string | null; vehicle_categories?: unknown }

function asArray<T>(v: T | T[] | null | undefined): T[] {
	if (v == null) return []
	return Array.isArray(v) ? v : [v]
}

function firstTripFromBooking(booking: { booking_trips?: unknown }): TripNested | null {
	const raw = booking.booking_trips
	const links = asArray<TripLink>(raw as TripLink[] | TripLink | null)
	if (links.length === 0) return null
	const sorted = [...links].sort((a, b) => {
		const sa = typeof a.sort_order === 'number' ? a.sort_order : 0
		const sb = typeof b.sort_order === 'number' ? b.sort_order : 0
		return sa - sb
	})
	for (const link of sorted) {
		const t = link.trips
		const trip = Array.isArray(t) ? t[0] : t
		if (trip && typeof trip === 'object') {
			return trip as TripNested
		}
	}
	return null
}

function vehicleCategoryLabelFromBooking(booking: { booking_trips?: unknown }): string | null {
	const trip = firstTripFromBooking(booking)
	if (!trip) return null
	const vRaw = trip.vehicles
	const v = Array.isArray(vRaw) ? vRaw[0] : vRaw
	if (!v || typeof v !== 'object') return null
	const cRaw = (v as VehicleNested).vehicle_categories
	const c = Array.isArray(cRaw) ? cRaw[0] : cRaw
	if (!c || typeof c !== 'object') return null
	const n = (c as { name?: string | null }).name
	return typeof n === 'string' && n.trim() !== '' ? n.trim() : null
}

function publicAppBaseUrl(): string {
	const raw = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '')
	return raw.length > 0 ? raw : 'http://localhost:3000'
}

function parseRpcSendQuotePayload(raw: unknown): { outcome: 'success'; idempotent: boolean } | { outcome: 'error'; error: string } {
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

export type SendWalkInQuoteResult =
	| { ok: true; correlationId: string; quoteId: string }
	| ReturnType<typeof buildOpsActionFailure>

export type SendWalkInQuoteInput = z.infer<typeof sendWalkInQuoteInputSchema>

/**
 * Epic 14 / Story **14.6** — staff-only: new **`booking_quotes`** version + **`walk-in-quote`** email with
 * **`/q/[token]/accept|reject|pay`** links (**US-D1**, **US-D2**).
 *
 * Quote amounts come from **`lineItems`** (ops-entered). Booking `total_amount` is not required at
 * submission time.
 */
export async function sendWalkInQuote(input: SendWalkInQuoteInput): Promise<SendWalkInQuoteResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = sendWalkInQuoteInputSchema.safeParse(input)
	if (!parsed.success) {
		logOpsAction({
			action: 'sendWalkInQuote',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		const first = parsed.error.flatten().fieldErrors
		const hint =
			first.lineItems?.[0] ??
			first.bookingId?.[0] ??
			'Check line descriptions, quantities, and ZAR amounts.'
		return buildOpsActionFailure('VALIDATION', hint, correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'sendWalkInQuote',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const bookingId = parsed.data.bookingId
	const staffUserId = gate.session.userId
	const lineItemsIn = parsed.data.lineItems

	const quoteTotal = lineItemsTotalSum(lineItemsIn)
	if (lineItemsIn.length === 0 || quoteTotal <= 0) {
		return buildOpsActionFailure(
			'VALIDATION',
			'Add at least one quote line with a description and a positive amount.',
			correlationId,
			{ reasonCode: 'QUOTE_TOTAL_NOT_POSITIVE' },
		)
	}

	const { data: bookingRaw, error: bErr } = await supabase
		.from('bookings')
		.select(BOOKING_WALK_IN_QUOTE_SELECT)
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr || bookingRaw == null || typeof bookingRaw !== 'object' || !('id' in bookingRaw)) {
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	const booking = bookingRaw as Record<string, unknown>
	const clientType = booking.client_type as ClientTypeDb
	if (clientType !== 'walk_in') {
		return buildOpsActionFailure(
			'VALIDATION',
			'Send quote is only available for walk-in bookings.',
			correlationId,
			{ reasonCode: 'NOT_WALK_IN' },
		)
	}

	const status = String(booking.status ?? '')
	const allowed = status === 'submitted' || status === 'triaged' || status === 'quote_sent'
	if (!allowed) {
		return buildOpsActionFailure(
			'VALIDATION',
			'Booking must be submitted, triaged, or quote sent to email a walk-in quote.',
			correlationId,
			{ reasonCode: 'BOOKING_STATUS' },
		)
	}

	const linePack = { items: lineItemsIn as BookingQuoteLineItem[], total: quoteTotal }

	const emailRes = await resolveSentToEmailForBooking(supabase, {
		client_type: clientType,
		customer_email: booking.customer_email as string | null,
		customer_id: booking.customer_id as string | null,
		customer_account_id: booking.customer_account_id as string | null,
		account_snapshot: booking.account_snapshot,
	})
	if (!emailRes.ok) {
		return buildOpsActionFailure('VALIDATION', emailRes.message, correlationId, {
			reasonCode: 'MISSING_RECIPIENT_EMAIL',
		})
	}
	const recipientEmail = emailRes.email

	const created = await createBookingQuote(bookingId, linePack.items, linePack.total, null)
	if (!created.ok) {
		return created
	}
	const newQuoteId = created.quoteId

	const { error: supErr } = await supabase
		.from('booking_quotes')
		.update({
			status: 'superseded',
			superseded_at: new Date().toISOString(),
			superseded_by_quote_id: newQuoteId,
		})
		.eq('booking_id', bookingId)
		.in('status', ['sent', 'rejected'])
		.neq('id', newQuoteId)

	if (supErr) {
		logOpsAction({
			action: 'sendWalkInQuote',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint: supErr.message,
		})
		return buildOpsActionFailure('DATABASE', `Could not supersede prior quotes: ${supErr.message}`, correlationId)
	}

	const { data: quoteRow, error: qLoadErr } = await supabase
		.from('booking_quotes')
		.select('id, booking_id, expires_at, total_zar')
		.eq('id', newQuoteId)
		.maybeSingle()

	if (qLoadErr || !quoteRow?.expires_at) {
		return buildOpsActionFailure('DATABASE', 'Could not load new quote for sending.', correlationId)
	}

	const expiresAtIso = quoteRow.expires_at as string
	let tokenExp: number
	try {
		tokenExp = quoteTokenExpiryMsFromExpiresAtIso(expiresAtIso)
	} catch {
		return buildOpsActionFailure('DATABASE', 'Invalid quote expiry timestamp.', correlationId)
	}

	const basePayload = {
		quoteId: newQuoteId,
		bookingId,
		exp: tokenExp,
	}
	const acceptToken = signQuoteToken({ ...basePayload, purpose: 'accept' })
	const rejectToken = signQuoteToken({ ...basePayload, purpose: 'reject' })
	const baseUrl = publicAppBaseUrl()
	const acceptUrl = `${baseUrl}/q/${encodeURIComponent(acceptToken)}/accept`
	const rejectUrl = `${baseUrl}/q/${encodeURIComponent(rejectToken)}/reject`

	const pickupIso = booking.pickup_datetime as string | null
	const pickupDateTimeLabel =
		pickupIso && pickupIso !== ''
			? new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(
					new Date(pickupIso),
				)
			: '—'
	const originLabel = ((booking.origin_name as string | null) ?? '').trim() || '—'
	const destinationLabel = ((booking.destination_name as string | null) ?? '').trim() || '—'
	const customerName = ((booking.customer_name as string | null) ?? '').trim() || 'there'
	const bookingRef =
		booking.payment_reference != null && String(booking.payment_reference).trim() !== ''
			? String(booking.payment_reference).trim()
			: bookingId

	const expiryFriendly = new Intl.DateTimeFormat('en-ZA', {
		timeZone: 'Africa/Johannesburg',
		weekday: 'short',
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short',
	}).format(new Date(expiresAtIso))

	const totalZarLabel = new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency: 'ZAR',
	}).format(linePack.total)

	const serviceSbGate = await createServiceRoleClient()

	// Epic 16 / Story 16.15 (Theme N / US-N4) — load full unmasked bank account JSON +
	// computed payment reference server-side. Hard-fail when missing/incomplete so we
	// never email a customer a quote with blank EFT details.
	const bankContext = await loadWalkInQuoteBankContext(serviceSbGate, bookingRef)
	if (!bankContext.ok) {
		logOpsAction({
			action: 'sendWalkInQuote',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: bankContext.error === 'DATABASE' ? 'DATABASE' : 'VALIDATION',
			bookingId,
			entityId: newQuoteId,
			hint: bankContext.message,
		})
		return buildOpsActionFailure(
			bankContext.error === 'DATABASE' ? 'DATABASE' : 'VALIDATION',
			bankContext.message,
			correlationId,
			{ reasonCode: `BANK_ACCOUNT_${bankContext.error}` },
		)
	}

	const emailProps: WalkInQuoteEmailProps = {
		customerName,
		bookingReference: bookingRef,
		pickupDateTimeLabel,
		originLabel,
		destinationLabel,
		vehicleCategoryLabel: vehicleCategoryLabelFromBooking(booking as { booking_trips?: unknown }),
		passengerCount: typeof booking.passenger_count === 'number' ? booking.passenger_count : null,
		totalZarLabel,
		lineItems: linePack.items,
		expiryFriendly,
		acceptUrl,
		rejectUrl,
		bankAccount: bankContext.bankAccount,
		paymentReference: bankContext.paymentReference,
		supportContactLine: resolveSupportContactLine(),
	}

	const renderedHtml = renderWalkInQuoteHtml(emailProps)

	const commsEventKey = 'quote_sent_walk_in' as const
	const matrixGate = await loadCommsEmailMatrixGate(serviceSbGate, commsEventKey, 'email')
	if (!matrixGate.ok) {
		await auditCommsMatrixPreSendBlocked({
			userSupabase: supabase,
			serviceSupabase: serviceSbGate,
			staffActorId: staffUserId,
			kind: matrixGate.kind,
			entity: 'booking',
			entityId: bookingId,
			eventKey: commsEventKey,
			channel: 'email',
			bookingId,
			quoteId: newQuoteId,
			correlationId,
		})
		return buildOpsActionFailure(
			'VALIDATION',
			matrixGate.kind === 'no_rules'
				? 'No active comms dispatch rules for walk-in quote email. An admin can add rules under Operations → Comms registry (/ops/comms), or apply the repair migration repair_comms_dispatch_rules_default_seed.'
				: 'No active comms template for walk-in quote email. An admin can add templates under Operations → Comms registry (/ops/comms).',
			correlationId,
			{ reasonCode: 'COMMS_MATRIX_NOT_CONFIGURED' },
		)
	}
	const matrixSnapshot: CommsMatrixEmailSnapshot = matrixGate.snapshot

	const { data: rpcRaw, error: rpcErr } = await supabase.rpc('ops_send_booking_quote_v1', {
		p_quote_id: newQuoteId,
		p_sent_to_email: recipientEmail,
		p_rendered_html: renderedHtml,
	})

	if (rpcErr) {
		logOpsAction({
			action: 'sendWalkInQuote',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: newQuoteId,
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
			return buildOpsActionFailure('VALIDATION', 'Only draft quotes can be sent.', correlationId, {
				reasonCode: 'QUOTE_NOT_DRAFT',
			})
		}
		if (rpc.error === 'invalid_email') {
			return buildOpsActionFailure('VALIDATION', 'Invalid recipient email.', correlationId)
		}
		return buildOpsActionFailure('DATABASE', 'Quote send failed', correlationId)
	}

	const { data: stRow, error: stErr } = await supabase
		.from('bookings')
		.update({ status: 'quote_sent' })
		.eq('id', bookingId)
		.in('status', ['submitted', 'triaged', 'quote_sent'])
		.select('id')
		.maybeSingle()

	if (stErr || !stRow?.id) {
		logOpsAction({
			action: 'sendWalkInQuote',
			outcome: 'failure',
			level: 'error',
			correlationId,
			bookingId,
			hint: stErr?.message ?? 'no_matching_booking_row',
		})
		return buildOpsActionFailure(
			'DATABASE',
			stErr
				? `Quote was marked sent but booking status could not be updated: ${stErr.message}`
				: 'Quote was marked sent but booking status did not match an updatable state.',
			correlationId,
		)
	}

	const subject = buildWalkInQuoteEmailSubject(bookingRef, expiresAtIso)
	const { data: qMeta } = await supabase
		.from('booking_quotes')
		.select('idempotency_key')
		.eq('id', newQuoteId)
		.maybeSingle()
	const idemKeyRaw =
		typeof qMeta?.idempotency_key === 'string' && qMeta.idempotency_key.trim() !== ''
			? `walk-in-quote-send:${qMeta.idempotency_key.trim()}`
			: `walk-in-quote-send:${newQuoteId}`
	const idempotencyKey = idemKeyRaw.length > 256 ? idemKeyRaw.slice(0, 256) : idemKeyRaw

	const serviceSb = await createServiceRoleClient()
	const sendResult = await sendCommsMatrixEmailDispatches({
		serviceSupabase: serviceSb,
		userSupabase: supabase,
		staffActorId: staffUserId,
		eventKey: commsEventKey,
		channel: 'email',
		entity: 'booking',
		entityId: bookingId,
		correlationId,
		bookingId,
		quoteId: newQuoteId,
		booking: {
			client_type: clientType,
			customer_email: booking.customer_email as string | null,
			customer_id: booking.customer_id as string | null,
			customer_account_id: booking.customer_account_id as string | null,
			account_snapshot: booking.account_snapshot,
			rider_email: booking.rider_email as string | null | undefined,
		},
		bookingRefLabel: bookingRef,
		snapshot: matrixSnapshot,
		getFallbackEmail: async () => ({ subject, html: renderedHtml }),
		baseIdempotencyKey: idempotencyKey,
	})

	if (sendResult.outcome === 'no_recipients') {
		const errMsg = 'No comms recipients resolved for configured dispatch rules.'
		logOpsAction({
			action: 'sendWalkInQuote',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'VALIDATION',
			entityId: newQuoteId,
			bookingId,
			hint: errMsg,
		})
		return buildOpsActionFailure('VALIDATION', errMsg, correlationId, {
			reasonCode: 'COMMS_MATRIX_NO_RECIPIENTS',
		})
	}

	if (sendResult.outcome === 'failed') {
		const errMsg = sendResult.message
		logOpsAction({
			action: 'sendWalkInQuote',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'EMAIL',
			entityId: newQuoteId,
			bookingId,
			hint: errMsg,
		})

		const attemptRes = await computeNextEmailFailureAttemptCountForQuote(supabase, newQuoteId)
		const attemptCount = attemptRes.ok ? attemptRes.attemptCount : 1

		const audit = await appendOpsAuditLog(supabase, {
			actorId: staffUserId,
			action: 'email_send_failed',
			entity: 'booking_quotes',
			entityId: newQuoteId,
			payload: {
				quote_id: newQuoteId,
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
		entityId: newQuoteId,
		payload: {
			quote_id: newQuoteId,
			mode: 'sent',
			template: 'walk-in-quote',
			comms_event_key: commsEventKey,
			comms_send_count: sendResult.outcome === 'sent' ? sendResult.sendCount : 0,
		},
	})
	if (!sentAudit.ok) {
		console.error('[vestroo:ops] appendOpsAuditLog email_sent failed:', sentAudit.message)
	}

	logOpsAction({
		action: 'sendWalkInQuote',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: newQuoteId,
		bookingId,
		meta: { emailMode: 'sent' },
	})

	return { ok: true, correlationId, quoteId: newQuoteId }
}
