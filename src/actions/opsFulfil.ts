'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import {
	matchesPendingBucket,
	TRIP_REQUEST_OPS_ACCEPTED_AT_KEY,
	tripRequestAcceptedAtFromMetadata,
	type FulfilBookingBucketInput,
} from '@/lib/fulfil-queue-buckets'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { createUserServerClient } from '@/lib/supabase/server'

const bookingIdSchema = z.object({
	bookingId: z.string().uuid(),
})

function metadataRecord(raw: unknown): Record<string, unknown> {
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		return { ...(raw as Record<string, unknown>) }
	}
	return {}
}

/**
 * Records manual/offline payment for bookings in the **pending** fulfil queue only.
 * Staff attest settlement out of band (EFT/cash); see Epic 16 / Theme N for the EFT workflow.
 */
export async function recordBookingPaymentReceivedAction(raw: z.infer<typeof bookingIdSchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = bookingIdSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'recordBookingPaymentReceived',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'recordBookingPaymentReceived',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}
	const staff = gate.session
	const supabase = await createUserServerClient()
	const { bookingId } = parsed.data

	const { data: booking, error: bErr } = await supabase
		.from('bookings')
		.select('id, status, payment_status, booking_intent')
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr) {
		logOpsAction({
			action: 'recordBookingPaymentReceived',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
		})
		return buildOpsActionFailure(
			'DATABASE',
			'Could not load booking. Try again or contact support if this persists.',
			correlationId,
		)
	}
	if (!booking) {
		logOpsAction({
			action: 'recordBookingPaymentReceived',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			bookingId,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	if (booking.status === 'cancelled') {
		logOpsAction({
			action: 'recordBookingPaymentReceived',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'NOT_RECORDABLE',
			bookingId,
		})
		return buildOpsActionFailure('NOT_RECORDABLE', 'Cancelled bookings cannot be marked paid here', correlationId)
	}

	const bucketRow: FulfilBookingBucketInput = {
		booking_intent: booking.booking_intent as string | null,
		status: booking.status as string | null,
		payment_status: booking.payment_status as string | null,
		hasBookingTripLink: false,
	}
	if (!matchesPendingBucket(bucketRow)) {
		logOpsAction({
			action: 'recordBookingPaymentReceived',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'NOT_PENDING_QUEUE',
			bookingId,
		})
		return buildOpsActionFailure(
			'NOT_PENDING_QUEUE',
			'Payment can only be recorded for bookings in the pending queue (not trip requests; must still need payment).',
			correlationId,
		)
	}

	const nowIso = new Date().toISOString()
	const { error: uErr } = await supabase
		.from('bookings')
		.update({
			status: 'paid',
			payment_status: 'paid',
			payment_timestamp: nowIso,
		})
		.eq('id', bookingId)

	if (uErr) {
		logOpsAction({
			action: 'recordBookingPaymentReceived',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
		})
		return buildOpsActionFailure(
			'DATABASE',
			'Could not update booking. Try again or contact support if this persists.',
			correlationId,
		)
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		action: 'record_booking_payment_received',
		entity: 'booking',
		entityId: bookingId,
		payload: {
			source: 'manual_ops',
			payment_timestamp: nowIso,
		},
	})
	if (!audit.ok) {
		logOpsAction({
			action: 'recordBookingPaymentReceived',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'AUDIT',
			bookingId,
		})
		return buildOpsActionFailure('AUDIT', audit.message, correlationId)
	}

	logOpsAction({
		action: 'recordBookingPaymentReceived',
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId,
	})

	revalidatePath('/ops/trips')
	return { ok: true as const }
}

/**
 * Marks a trip-request booking as accepted by ops (`booking_metadata` ISO timestamp).
 */
export async function acceptTripRequestBookingAction(raw: z.infer<typeof bookingIdSchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = bookingIdSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'acceptTripRequestBooking',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'acceptTripRequestBooking',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}
	const staff = gate.session
	const supabase = await createUserServerClient()
	const { bookingId } = parsed.data

	const { data: booking, error: bErr } = await supabase
		.from('bookings')
		.select('id, booking_intent, booking_metadata')
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr) {
		logOpsAction({
			action: 'acceptTripRequestBooking',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
		})
		return buildOpsActionFailure(
			'DATABASE',
			'Could not load booking. Try again or contact support if this persists.',
			correlationId,
		)
	}
	if (!booking) {
		logOpsAction({
			action: 'acceptTripRequestBooking',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			bookingId,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	if (booking.booking_intent !== 'trip_request') {
		logOpsAction({
			action: 'acceptTripRequestBooking',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'NOT_TRIP_REQUEST',
			bookingId,
		})
		return buildOpsActionFailure('NOT_TRIP_REQUEST', 'Only trip request bookings can be marked accepted here', correlationId)
	}

	const meta = metadataRecord(booking.booking_metadata)
	if (tripRequestAcceptedAtFromMetadata(meta)) {
		logOpsAction({
			action: 'acceptTripRequestBooking',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'NO_CHANGE',
			bookingId,
		})
		return buildOpsActionFailure('NO_CHANGE', 'This trip request is already marked accepted', correlationId)
	}

	const nowIso = new Date().toISOString()
	const nextMeta = { ...meta, [TRIP_REQUEST_OPS_ACCEPTED_AT_KEY]: nowIso }

	const { error: uErr } = await supabase
		.from('bookings')
		.update({ booking_metadata: nextMeta })
		.eq('id', bookingId)

	if (uErr) {
		logOpsAction({
			action: 'acceptTripRequestBooking',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
		})
		return buildOpsActionFailure(
			'DATABASE',
			'Could not update booking. Try again or contact support if this persists.',
			correlationId,
		)
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		action: 'accept_trip_request_booking',
		entity: 'booking',
		entityId: bookingId,
		payload: { trip_request_ops_accepted_at: nowIso },
	})
	if (!audit.ok) {
		logOpsAction({
			action: 'acceptTripRequestBooking',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'AUDIT',
			bookingId,
		})
		return buildOpsActionFailure('AUDIT', audit.message, correlationId)
	}

	logOpsAction({
		action: 'acceptTripRequestBooking',
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId,
	})

	revalidatePath('/ops/trips')
	return { ok: true as const }
}
