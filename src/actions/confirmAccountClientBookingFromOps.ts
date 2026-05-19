'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { evaluateAccountClientConfirmationTripGate } from '@/lib/ops-account-client-confirmation-trip-gate'
import { tryAutoConfirmAccountClientBooking } from '@/lib/ops-account-client-auto-confirm'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { createUserServerClient } from '@/lib/supabase/server'

const schema = z.object({
	bookingId: z.string().uuid(),
})

/**
 * Ops: after **trip assignment** (booking_trips) and a **saved quote** (any `booking_quotes` row),
 * moves an account portal booking from `pending_confirmation` → `assigned` (single confirmation gate).
 */
export async function confirmAccountClientBookingFromOps(raw: unknown) {
	const correlationId = newOpsCorrelationId()
	const parsed = schema.safeParse(raw)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid booking id', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const bookingId = parsed.data.bookingId

	const { data: booking, error: bErr } = await supabase
		.from('bookings')
		.select('id, client_type, status')
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr || !booking) {
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	if (booking.client_type !== 'account_client') {
		return buildOpsActionFailure('VALIDATION', 'Only account client bookings use this confirmation path.', correlationId)
	}

	if (booking.status !== 'pending_confirmation') {
		return buildOpsActionFailure(
			'VALIDATION',
			'Booking is not awaiting confirmation from operations.',
			correlationId,
		)
	}

	const tripGate = await evaluateAccountClientConfirmationTripGate(supabase, bookingId)
	if (!tripGate.ok) {
		return buildOpsActionFailure('VALIDATION', tripGate.message, correlationId)
	}

	const { data: quoteRow, error: qErr } = await supabase
		.from('booking_quotes')
		.select('id, status')
		.eq('booking_id', bookingId)
		.order('version', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (qErr || !quoteRow?.id) {
		return buildOpsActionFailure('VALIDATION', 'Add and save a quote before confirming this booking.', correlationId)
	}

	const qs = String(quoteRow.status ?? '')
	if (!['draft', 'sent', 'accepted'].includes(qs)) {
		return buildOpsActionFailure(
			'VALIDATION',
			'The latest quote is not in a savable state for confirmation.',
			correlationId,
		)
	}

	const auto = await tryAutoConfirmAccountClientBooking(supabase, bookingId)
	if (!auto.confirmed) {
		return buildOpsActionFailure(
			'VALIDATION',
			'Booking could not be confirmed. Ensure a quote is saved and a trip is linked.',
			correlationId,
		)
	}

	revalidatePath('/ops/bookings')
	revalidatePath(`/ops/bookings/${bookingId}`)
	revalidatePath('/account/bookings')
	revalidatePath(`/account/bookings/${bookingId}`)

	logOpsAction({
		action: 'confirmAccountClientBookingFromOps',
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId,
	})

	return { ok: true as const, correlationId }
}
