'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { createUserServerClient } from '@/lib/supabase/server'

const ACTION = 'triageAccountBooking' as const

const inputSchema = z.object({
	bookingId: z.string().uuid(),
})

/**
 * Moves an **account-client** booking from **`submitted` → `triaged`** (Story 16.21 / US-A2 **New** tab CTA).
 * Mirrors `triageWalkInBookingAction` (Story 16.20) — kept as a sibling rather than generalising the walk-in
 * action so test coverage and audit `action` strings remain client-type-distinct.
 */
export async function triageAccountBookingAction(
	raw: unknown,
): Promise<{ ok: true; bookingId: string } | ReturnType<typeof buildOpsActionFailure>> {
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

	const { bookingId } = parsed.data

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

	const { data: row, error: loadErr } = await supabase
		.from('bookings')
		.select('id, client_type, status')
		.eq('id', bookingId)
		.maybeSingle()

	if (loadErr || !row?.id) {
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

	if (row.client_type !== 'account_client') {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'INVALID_CLIENT_TYPE',
			bookingId,
		})
		return buildOpsActionFailure(
			'INVALID_CLIENT_TYPE',
			'Only account-client bookings can be triaged from this action.',
			correlationId,
		)
	}

	if (row.status !== 'submitted') {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'INVALID_STATUS',
			bookingId,
		})
		return buildOpsActionFailure(
			'INVALID_STATUS',
			'Only bookings in submitted status can be triaged here.',
			correlationId,
		)
	}

	const { data: updated, error: uErr } = await supabase
		.from('bookings')
		.update({ status: 'triaged' })
		.eq('id', bookingId)
		.eq('status', 'submitted')
		.eq('client_type', 'account_client')
		.select('id')
		.maybeSingle()

	if (uErr || !updated?.id) {
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
			'Could not update booking. Try again.',
			correlationId,
		)
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staff.role === 'admin' ? 'admin' : 'dispatcher',
		action: 'account_triaged',
		entity: 'booking',
		entityId: bookingId,
		payload: { prior_status: 'submitted', new_status: 'triaged' },
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
	})

	revalidatePath('/ops/bookings')

	return { ok: true, bookingId }
}
