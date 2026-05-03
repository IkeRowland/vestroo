'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import {
	type MarkBookingPaymentReceivedSuccess,
	PAYMENT_EVIDENCE_REF_MAX_LENGTH,
	PAYMENT_VARIANCE_TOLERANCE_ZAR,
} from '@/actions/markBookingPaymentReceived.types'
import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { createUserServerClient } from '@/lib/supabase/server'

/**
 * Epic 16 / Theme N — US-N3 (Q32). The **only** supported path (post-US-N2 checkout-provider
 * removal) for an ops dispatcher / admin to mark a booking as settled by EFT.
 *
 * - **Walk-in** (`client_type = 'walk_in'`): `awaiting_payment` → `ready_to_assign`.
 * - **Account** (`client_type = 'account_client'`): `invoiced` → `paid`.
 *
 * Always sets `bookings.payment_status = 'paid'`, stamps `payment_received_at`, and persists
 * `payment_evidence_ref`. Writes a single `ops_audit_log` row with
 * `action = 'payment_received_eft'` on first-time success; idempotent re-marks are no-ops.
 *
 * Variance: when `|amountZar - expected|` exceeds **R 0.01** (1 cent) compared with the
 * authoritative settlement amount (latest `booking_quotes.total_zar` for walk-ins; the
 * booking row's `total_amount` for accounts), the caller must supply a
 * `varianceReason` of **≥ 10 characters** which is persisted on the audit payload.
 */

const ACTION = 'markBookingPaymentReceived' as const

const inputSchema = z.object({
	bookingId: z.string().uuid(),
	evidenceRef: z
		.string()
		.trim()
		.min(1, 'evidenceRef is required')
		.max(PAYMENT_EVIDENCE_REF_MAX_LENGTH, 'evidenceRef is too long'),
	amountZar: z.number().finite().positive(),
	receivedAt: z.string().min(1),
	varianceReason: z.string().optional(),
})

type MarkBookingPaymentReceivedInput = z.infer<typeof inputSchema>

type BookingForMark = {
	id: string
	client_type: string | null
	status: string | null
	payment_status: string | null
	payment_received_at: string | null
	payment_evidence_ref: string | null
	total_amount: number | string | null
	current_quote_id: string | null
}

type ResolvedExpectedAmount = {
	amountZar: number | null
	source: 'booking_quote' | 'booking_total_amount' | 'unknown'
}

function toFiniteNumber(raw: number | string | null | undefined): number | null {
	if (raw == null) return null
	const n = typeof raw === 'string' ? Number(raw) : raw
	return Number.isFinite(n) ? n : null
}

function isPostMarkTerminalState(clientType: string | null, status: string | null): boolean {
	if (clientType === 'walk_in') return status === 'ready_to_assign'
	if (clientType === 'account_client') return status === 'paid'
	return false
}

function isMarkableStatus(clientType: string | null, status: string | null): boolean {
	if (clientType === 'walk_in') return status === 'awaiting_payment'
	if (clientType === 'account_client') return status === 'invoiced'
	return false
}

function nextStatusForClientType(clientType: string | null): 'ready_to_assign' | 'paid' | null {
	if (clientType === 'walk_in') return 'ready_to_assign'
	if (clientType === 'account_client') return 'paid'
	return null
}

async function loadBookingForMark(
	supabase: Awaited<ReturnType<typeof createUserServerClient>>,
	bookingId: string,
): Promise<BookingForMark | null> {
	const { data, error } = await supabase
		.from('bookings')
		.select(
			'id, client_type, status, payment_status, payment_received_at, payment_evidence_ref, total_amount, current_quote_id',
		)
		.eq('id', bookingId)
		.maybeSingle()
	if (error || !data) return null
	return data as unknown as BookingForMark
}

async function resolveExpectedAmountZar(
	supabase: Awaited<ReturnType<typeof createUserServerClient>>,
	booking: BookingForMark,
): Promise<ResolvedExpectedAmount> {
	if (booking.client_type === 'walk_in') {
		if (booking.current_quote_id) {
			const { data, error } = await supabase
				.from('booking_quotes')
				.select('total_zar')
				.eq('id', booking.current_quote_id)
				.maybeSingle()
			if (!error && data) {
				const amount = toFiniteNumber((data as { total_zar: number | string | null }).total_zar)
				if (amount != null) {
					return { amountZar: amount, source: 'booking_quote' }
				}
			}
		}
		const { data: viewRow, error: viewErr } = await supabase
			.from('v_booking_current_quote')
			.select('total_zar')
			.eq('booking_id', booking.id)
			.maybeSingle()
		if (!viewErr && viewRow) {
			const amount = toFiniteNumber((viewRow as { total_zar: number | string | null }).total_zar)
			if (amount != null) {
				return { amountZar: amount, source: 'booking_quote' }
			}
		}
		return { amountZar: null, source: 'unknown' }
	}

	if (booking.client_type === 'account_client') {
		const amount = toFiniteNumber(booking.total_amount)
		return { amountZar: amount, source: amount != null ? 'booking_total_amount' : 'unknown' }
	}

	return { amountZar: null, source: 'unknown' }
}

/**
 * Server Action — see file-level JSDoc for the full contract.
 */
export async function markBookingPaymentReceivedAction(
	raw: unknown,
): Promise<
	| MarkBookingPaymentReceivedSuccess
	| ReturnType<typeof buildOpsActionFailure>
> {
	const correlationId = newOpsCorrelationId()
	const parsed = inputSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: ACTION,
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId)
	}

	const input: MarkBookingPaymentReceivedInput = parsed.data

	const receivedAtMs = Date.parse(input.receivedAt)
	if (Number.isNaN(receivedAtMs)) {
		logOpsAction({
			action: ACTION,
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'INVALID_RECEIVED_AT',
		})
		return buildOpsActionFailure(
			'INVALID_RECEIVED_AT',
			'receivedAt must be a valid ISO timestamp',
			correlationId,
		)
	}
	if (receivedAtMs > Date.now()) {
		logOpsAction({
			action: ACTION,
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'FUTURE_RECEIVED_AT',
		})
		return buildOpsActionFailure(
			'FUTURE_RECEIVED_AT',
			'receivedAt cannot be in the future',
			correlationId,
		)
	}
	const receivedAtIso = new Date(receivedAtMs).toISOString()

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: ACTION,
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
	const { bookingId, evidenceRef, amountZar } = input
	const evidenceRefTrimmed = evidenceRef.trim()

	const booking = await loadBookingForMark(supabase, bookingId)
	if (!booking) {
		logOpsAction({
			action: ACTION,
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			bookingId,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	if (
		booking.payment_status === 'paid' &&
		booking.payment_received_at != null &&
		isPostMarkTerminalState(booking.client_type, booking.status)
	) {
		const nextStatus = nextStatusForClientType(booking.client_type)
		logOpsAction({
			action: ACTION,
			outcome: 'success',
			level: 'info',
			correlationId,
			bookingId,
			meta: { idempotent: true },
		})
		return {
			ok: true,
			bookingId,
			priorStatus: booking.status ?? '',
			newStatus: (nextStatus ?? 'ready_to_assign') as 'ready_to_assign' | 'paid',
			idempotent: true,
			variance: false,
		}
	}

	if (!isMarkableStatus(booking.client_type, booking.status)) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'INVALID_STATUS_FOR_PAYMENT_MARK',
			bookingId,
		})
		return buildOpsActionFailure(
			'INVALID_STATUS_FOR_PAYMENT_MARK',
			'This booking is not in a state that can be marked paid by EFT.',
			correlationId,
		)
	}

	const expected = await resolveExpectedAmountZar(supabase, booking)
	const expectedAmount = expected.amountZar
	const hasExpected = expectedAmount != null
	const variance = hasExpected
		? Math.abs(amountZar - (expectedAmount as number)) > PAYMENT_VARIANCE_TOLERANCE_ZAR
		: false
	const reasonTrimmed = (input.varianceReason ?? '').trim()

	if (variance && reasonTrimmed.length < 10) {
		logOpsAction({
			action: ACTION,
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VARIANCE_REASON_REQUIRED',
			bookingId,
		})
		return buildOpsActionFailure(
			'VARIANCE_REASON_REQUIRED',
			'A variance reason of at least 10 characters is required when the received amount differs from the expected amount.',
			correlationId,
		)
	}

	const nextStatus = nextStatusForClientType(booking.client_type)
	if (!nextStatus) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'INVALID_STATUS_FOR_PAYMENT_MARK',
			bookingId,
		})
		return buildOpsActionFailure(
			'INVALID_STATUS_FOR_PAYMENT_MARK',
			'This booking is not in a state that can be marked paid by EFT.',
			correlationId,
		)
	}

	const priorStatus = booking.status ?? ''

	const { data: updatedRow, error: uErr } = await supabase
		.from('bookings')
		.update({
			payment_status: 'paid',
			payment_received_at: receivedAtIso,
			payment_evidence_ref: evidenceRefTrimmed,
			status: nextStatus,
		})
		.eq('id', bookingId)
		.eq('status', priorStatus)
		.eq('client_type', booking.client_type)
		.select('id')
		.maybeSingle()

	if (uErr || !updatedRow?.id) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint: uErr?.message,
		})
		return buildOpsActionFailure(
			'DATABASE',
			'Could not update booking. Try again or contact support if this persists.',
			correlationId,
		)
	}

	const auditPayload: Record<string, unknown> = {
		evidence_ref: evidenceRefTrimmed,
		amount_zar: amountZar,
		prior_status: priorStatus,
		new_status: nextStatus,
		received_at: receivedAtIso,
		expected_amount_zar: hasExpected ? expectedAmount : null,
		expected_amount_source: expected.source,
		client_type: booking.client_type,
	}
	if (variance) {
		auditPayload.variance_reason = reasonTrimmed
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staff.role === 'admin' ? 'admin' : 'dispatcher',
		action: 'payment_received_eft',
		entity: 'booking',
		entityId: bookingId,
		payload: auditPayload,
	})
	if (!audit.ok) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'AUDIT',
			bookingId,
			hint: audit.message,
		})
		return buildOpsActionFailure('AUDIT', audit.message, correlationId)
	}

	logOpsAction({
		action: ACTION,
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId,
		meta: { idempotent: false, variance },
	})

	revalidatePath('/ops/bookings')
	revalidatePath('/ops/trips')

	return {
		ok: true,
		bookingId,
		priorStatus,
		newStatus: nextStatus,
		idempotent: false,
		variance,
	}
}
