'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { createBookingQuote, sendBookingQuote } from '@/actions/bookingQuoteOps'
import { tryAutoConfirmAccountClientBooking } from '@/lib/ops-account-client-auto-confirm'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { createUserServerClient } from '@/lib/supabase/server'
import { bookingQuoteLineItemsSchema, type BookingQuoteLineItem } from '@/types/booking-quote'
import type { ClientTypeDb } from '@/types/database.types'

const sendAccountBookingQuoteInputSchema = z.object({
	bookingId: z.string().uuid(),
	lineItems: bookingQuoteLineItemsSchema,
})

function roundMoney2(value: number): number {
	return Math.round(value * 100) / 100
}

function lineItemsTotalSum(lineItems: BookingQuoteLineItem[]): number {
	return roundMoney2(lineItems.reduce((acc, row) => acc + row.total_zar, 0))
}

export type SendAccountBookingQuoteResult =
	| { ok: true; correlationId: string; quoteId: string }
	| ReturnType<typeof buildOpsActionFailure>

export type SendAccountBookingQuoteInput = z.infer<typeof sendAccountBookingQuoteInputSchema>

/**
 * Ops: first or revised quote for **account_client** bookings — draft via {@link createBookingQuote},
 * then {@link sendBookingQuote} (account trip-confirmation email + comms matrix `quote_sent_account`).
 */
export async function sendAccountBookingQuote(
	input: SendAccountBookingQuoteInput,
): Promise<SendAccountBookingQuoteResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = sendAccountBookingQuoteInputSchema.safeParse(input)
	if (!parsed.success) {
		logOpsAction({
			action: 'sendAccountBookingQuote',
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
			action: 'sendAccountBookingQuote',
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
		.select('id, client_type, status')
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr || bookingRaw == null || typeof bookingRaw !== 'object' || !('id' in bookingRaw)) {
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	const clientType = bookingRaw.client_type as ClientTypeDb
	if (clientType !== 'account_client') {
		return buildOpsActionFailure(
			'VALIDATION',
			'Send quote from here is only available for account client bookings.',
			correlationId,
			{ reasonCode: 'NOT_ACCOUNT_CLIENT' },
		)
	}

	const status = String(bookingRaw.status ?? '')
	const allowed =
		status === 'submitted' ||
		status === 'triaged' ||
		status === 'quote_sent' ||
		status === 'pending_confirmation'
	if (!allowed) {
		return buildOpsActionFailure(
			'VALIDATION',
			'Booking must be submitted, triaged, quote sent, or pending confirmation to use this quote form.',
			correlationId,
			{ reasonCode: 'BOOKING_STATUS' },
		)
	}

	const created = await createBookingQuote(bookingId, lineItemsIn, quoteTotal, null)
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
			action: 'sendAccountBookingQuote',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint: supErr.message,
		})
		return buildOpsActionFailure('DATABASE', `Could not supersede prior quotes: ${supErr.message}`, correlationId)
	}

	const sent = await sendBookingQuote(newQuoteId)
	if (!sent.ok) {
		return sent
	}

	revalidatePath('/account/bookings')
	revalidatePath(`/account/bookings/${bookingId}`)

	logOpsAction({
		action: 'sendAccountBookingQuote',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: newQuoteId,
		bookingId,
	})

	return { ok: true, correlationId, quoteId: newQuoteId }
}

export type SaveAccountBookingQuoteDraftResult =
	| { ok: true; correlationId: string; quoteId: string }
	| ReturnType<typeof buildOpsActionFailure>

const accountQuoteSaveStatuses = new Set([
	'submitted',
	'triaged',
	'quote_sent',
	'pending_confirmation',
])

/**
 * Ops: persist a quote for account portal bookings without emailing.
 * When status is `pending_confirmation` and a trip is linked, auto-confirms to `assigned`.
 */
export async function saveAccountBookingQuoteDraft(
	input: SendAccountBookingQuoteInput,
): Promise<SaveAccountBookingQuoteDraftResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = sendAccountBookingQuoteInputSchema.safeParse(input)
	if (!parsed.success) {
		logOpsAction({
			action: 'saveAccountBookingQuoteDraft',
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
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const bookingId = parsed.data.bookingId
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
		.select('id, client_type, status')
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr || bookingRaw == null || typeof bookingRaw !== 'object' || !('id' in bookingRaw)) {
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	const clientType = bookingRaw.client_type as ClientTypeDb
	if (clientType !== 'account_client') {
		return buildOpsActionFailure(
			'VALIDATION',
			'Draft save is only available for account client bookings.',
			correlationId,
			{ reasonCode: 'NOT_ACCOUNT_CLIENT' },
		)
	}

	const status = String(bookingRaw.status ?? '')
	if (!accountQuoteSaveStatuses.has(status)) {
		return buildOpsActionFailure(
			'VALIDATION',
			'Booking must be submitted, triaged, quote sent, or pending confirmation to save a quote.',
			correlationId,
			{ reasonCode: 'BOOKING_STATUS' },
		)
	}

	const created = await createBookingQuote(bookingId, lineItemsIn, quoteTotal, null)
	if (!created.ok) {
		return created
	}
	const newQuoteId = created.quoteId

	const { error: upErr } = await supabase
		.from('bookings')
		.update({ current_quote_id: newQuoteId })
		.eq('id', bookingId)

	if (upErr) {
		logOpsAction({
			action: 'saveAccountBookingQuoteDraft',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint: upErr.message,
		})
		return buildOpsActionFailure('DATABASE', upErr.message, correlationId)
	}

	if (status === 'pending_confirmation') {
		await tryAutoConfirmAccountClientBooking(supabase, bookingId)
	}

	revalidatePath('/account/bookings')
	revalidatePath(`/account/bookings/${bookingId}`)
	revalidatePath('/ops/bookings')
	revalidatePath(`/ops/bookings/${bookingId}`)

	logOpsAction({
		action: 'saveAccountBookingQuoteDraft',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: newQuoteId,
		bookingId,
	})

	return { ok: true, correlationId, quoteId: newQuoteId }
}
