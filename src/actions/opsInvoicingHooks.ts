'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { corporateInvoicingFieldsSchema } from '@/actions/booking-schemas'
import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { appendBookingStatusHistoryEntry } from '@/lib/ops-trip-complete-booking-invoice-hook'
import { createServerClient, createUserServerClient } from '@/lib/supabase/server'

const updateBookingInvoicingSchema = z
	.object({
		bookingId: z.string().uuid(),
	})
	.merge(corporateInvoicingFieldsSchema)

/**
 * Staff-only MVP: adjust corporate invoicing flags on a booking (no PDF invoice).
 * See docs/integrations-and-payments.md.
 */
export async function updateBookingInvoicingHooksAction(input: unknown) {
	const correlationId = newOpsCorrelationId()
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'updateBookingInvoicingHooksAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const parsed = updateBookingInvoicingSchema.safeParse(input)
	if (!parsed.success) {
		logOpsAction({
			action: 'updateBookingInvoicingHooksAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid input', correlationId)
	}

	const { bookingId, invoiceRequested, purchaseOrderRef, billingEntityRef } = parsed.data

	const patch: Record<string, unknown> = {}
	if (invoiceRequested !== undefined) {
		patch.invoice_requested = invoiceRequested
	}
	if (purchaseOrderRef !== undefined) {
		patch.purchase_order_ref = purchaseOrderRef?.trim() || null
	}
	if (billingEntityRef !== undefined) {
		patch.billing_entity_ref = billingEntityRef?.trim() || null
	}

	if (Object.keys(patch).length === 0) {
		logOpsAction({
			action: 'updateBookingInvoicingHooksAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'NO_FIELDS',
			bookingId,
		})
		return buildOpsActionFailure('NO_FIELDS', 'No fields to update', correlationId)
	}

	const supabase = await createServerClient()
	const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId)

	if (error) {
		logOpsAction({
			action: 'updateBookingInvoicingHooksAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', 'Update failed', correlationId)
	}

	logOpsAction({
		action: 'updateBookingInvoicingHooksAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId,
		meta: { patch_keys: Object.keys(patch).join(',') },
	})
	return { ok: true as const }
}

const markInvoicedSchema = z.object({
	bookingId: z.string().uuid(),
	externalInvoiceRef: z.string().max(240).optional().nullable(),
})

const markPaidInvoiceSchema = z.object({
	bookingId: z.string().uuid(),
})

export type MarkInvoicedActionResult =
	| { ok: true; idempotent?: boolean; correlationId: string }
	| ReturnType<typeof buildOpsActionFailure>

export type MarkPaidActionResult =
	| { ok: true; idempotent?: boolean; correlationId: string }
	| ReturnType<typeof buildOpsActionFailure>

/**
 * Staff-only: `ready_to_invoice` → `invoiced`, optional `external_invoice_ref`.
 * Idempotent: if already `invoiced`, returns success without mutating.
 */
export async function markInvoicedAction(input: unknown): Promise<MarkInvoicedActionResult> {
	const correlationId = newOpsCorrelationId()
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'markInvoicedAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const parsed = markInvoicedSchema.safeParse(input)
	if (!parsed.success) {
		logOpsAction({
			action: 'markInvoicedAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid input', correlationId)
	}

	const { bookingId, externalInvoiceRef } = parsed.data
	const refTrimmed =
		typeof externalInvoiceRef === 'string' && externalInvoiceRef.trim() !== '' ?
			externalInvoiceRef.trim()
		:	null

	const supabase = await createUserServerClient()
	const { data: row, error: loadErr } = await supabase
		.from('bookings')
		.select('id, status, status_history')
		.eq('id', bookingId)
		.maybeSingle()

	if (loadErr || !row?.id) {
		logOpsAction({
			action: 'markInvoicedAction',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			bookingId,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	const status = typeof row.status === 'string' ? row.status : ''
	if (status === 'invoiced') {
		logOpsAction({
			action: 'markInvoicedAction',
			outcome: 'success',
			level: 'info',
			correlationId,
			bookingId,
			meta: { idempotent: true },
		})
		return { ok: true as const, idempotent: true, correlationId }
	}
	if (status !== 'ready_to_invoice') {
		logOpsAction({
			action: 'markInvoicedAction',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'BAD_STATUS',
			bookingId,
			meta: { current_status: status },
		})
		return buildOpsActionFailure(
			'BAD_STATUS',
			`Mark invoiced requires status ready_to_invoice (current: ${status || 'unknown'}).`,
			correlationId,
		)
	}

	const nextHistory = appendBookingStatusHistoryEntry(
		row.status_history,
		status,
		'invoiced',
		'ops_mark_invoiced',
	)

	const { data: updatedRows, error: upErr } = await supabase
		.from('bookings')
		.update({
			status: 'invoiced',
			external_invoice_ref: refTrimmed,
			status_history: nextHistory,
		})
		.eq('id', bookingId)
		.eq('status', 'ready_to_invoice')
		.select('id')

	if (upErr) {
		logOpsAction({
			action: 'markInvoicedAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint: upErr.message,
		})
		return buildOpsActionFailure('DATABASE', 'Could not update booking', correlationId)
	}

	if (!updatedRows || updatedRows.length === 0) {
		const { data: again } = await supabase
			.from('bookings')
			.select('status')
			.eq('id', bookingId)
			.maybeSingle()
		const againStatus = typeof again?.status === 'string' ? again.status : ''
		if (againStatus === 'invoiced') {
			logOpsAction({
				action: 'markInvoicedAction',
				outcome: 'success',
				level: 'info',
				correlationId,
				bookingId,
				meta: { idempotent: true, reason: 'concurrent_transition' },
			})
			return { ok: true as const, idempotent: true, correlationId }
		}
		logOpsAction({
			action: 'markInvoicedAction',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'BAD_STATUS',
			bookingId,
		})
		return buildOpsActionFailure(
			'BAD_STATUS',
			'Booking status changed before update completed. Refresh the queue.',
			correlationId,
		)
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		action: 'mark_invoiced',
		entity: 'booking',
		entityId: bookingId,
		payload: {
			booking_id: bookingId,
			from: 'ready_to_invoice',
			to: 'invoiced',
			external_invoice_ref: refTrimmed,
		},
	})
	if (!audit.ok) {
		logOpsAction({
			action: 'markInvoicedAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'AUDIT',
			bookingId,
		})
		return buildOpsActionFailure('AUDIT', audit.message, correlationId)
	}

	logOpsAction({
		action: 'markInvoicedAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId,
	})
	revalidatePath('/ops/invoicing')
	revalidatePath('/ops/bookings')
	return { ok: true as const, correlationId }
}

/**
 * Staff-only: `invoiced` → `paid_invoice`, sets `payment_status` / `payment_timestamp`.
 * Idempotent: if already `paid_invoice`, returns success without mutating.
 */
export async function markPaidAction(input: unknown): Promise<MarkPaidActionResult> {
	const correlationId = newOpsCorrelationId()
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'markPaidAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const parsed = markPaidInvoiceSchema.safeParse(input)
	if (!parsed.success) {
		logOpsAction({
			action: 'markPaidAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid input', correlationId)
	}

	const { bookingId } = parsed.data
	const supabase = await createUserServerClient()
	const { data: row, error: loadErr } = await supabase
		.from('bookings')
		.select('id, status, status_history')
		.eq('id', bookingId)
		.maybeSingle()

	if (loadErr || !row?.id) {
		logOpsAction({
			action: 'markPaidAction',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			bookingId,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	const status = typeof row.status === 'string' ? row.status : ''
	if (status === 'paid_invoice') {
		logOpsAction({
			action: 'markPaidAction',
			outcome: 'success',
			level: 'info',
			correlationId,
			bookingId,
			meta: { idempotent: true },
		})
		return { ok: true as const, idempotent: true, correlationId }
	}
	if (status !== 'invoiced') {
		logOpsAction({
			action: 'markPaidAction',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'BAD_STATUS',
			bookingId,
			meta: { current_status: status },
		})
		return buildOpsActionFailure(
			'BAD_STATUS',
			`Mark paid requires status invoiced (current: ${status || 'unknown'}).`,
			correlationId,
		)
	}

	const nowIso = new Date().toISOString()
	const nextHistory = appendBookingStatusHistoryEntry(
		row.status_history,
		status,
		'paid_invoice',
		'ops_mark_paid_invoice',
	)

	const { data: updatedPaidRows, error: upErr } = await supabase
		.from('bookings')
		.update({
			status: 'paid_invoice',
			payment_status: 'paid',
			payment_timestamp: nowIso,
			status_history: nextHistory,
		})
		.eq('id', bookingId)
		.eq('status', 'invoiced')
		.select('id')

	if (upErr) {
		logOpsAction({
			action: 'markPaidAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint: upErr.message,
		})
		return buildOpsActionFailure('DATABASE', 'Could not update booking', correlationId)
	}

	if (!updatedPaidRows || updatedPaidRows.length === 0) {
		const { data: again } = await supabase
			.from('bookings')
			.select('status')
			.eq('id', bookingId)
			.maybeSingle()
		const againStatus = typeof again?.status === 'string' ? again.status : ''
		if (againStatus === 'paid_invoice') {
			logOpsAction({
				action: 'markPaidAction',
				outcome: 'success',
				level: 'info',
				correlationId,
				bookingId,
				meta: { idempotent: true, reason: 'concurrent_transition' },
			})
			return { ok: true as const, idempotent: true, correlationId }
		}
		logOpsAction({
			action: 'markPaidAction',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'BAD_STATUS',
			bookingId,
		})
		return buildOpsActionFailure(
			'BAD_STATUS',
			'Booking status changed before update completed. Refresh the queue.',
			correlationId,
		)
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		action: 'mark_paid',
		entity: 'booking',
		entityId: bookingId,
		payload: {
			booking_id: bookingId,
			from: 'invoiced',
			to: 'paid_invoice',
			payment_timestamp: nowIso,
		},
	})
	if (!audit.ok) {
		logOpsAction({
			action: 'markPaidAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'AUDIT',
			bookingId,
		})
		return buildOpsActionFailure('AUDIT', audit.message, correlationId)
	}

	logOpsAction({
		action: 'markPaidAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId,
	})
	revalidatePath('/ops/invoicing')
	revalidatePath('/ops/bookings')
	return { ok: true as const, correlationId }
}
