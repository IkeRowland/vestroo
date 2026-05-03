'use server'

import { revalidatePath } from 'next/cache'
import type { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import {
	closeProtectionBookingIdSchema,
	closeProtectionEngagementIdSchema,
	createCloseProtectionEngagementSchema,
	listCloseProtectionEngagementsSchema,
	updateCloseProtectionEngagementSchema,
} from '@/lib/ops-close-protection-schemas'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { createUserServerClient } from '@/lib/supabase/server'
import type { CloseProtectionEngagementStatusDb, ProfileRole } from '@/types/database.types'

async function assertTripLinkedToBooking(
	supabase: Awaited<ReturnType<typeof createUserServerClient>>,
	bookingId: string,
	tripId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const { data: link, error } = await supabase
		.from('booking_trips')
		.select('booking_id')
		.eq('booking_id', bookingId)
		.eq('trip_id', tripId)
		.maybeSingle()

	if (error) {
		return { ok: false, message: error.message }
	}
	if (!link) {
		return { ok: false, message: 'Trip is not linked to this booking' }
	}
	return { ok: true }
}

function staffActorRole(role: ProfileRole): 'admin' | 'dispatcher' {
	return role === 'admin' ? 'admin' : 'dispatcher'
}

export async function createCloseProtectionEngagementAction(
	raw: z.infer<typeof createCloseProtectionEngagementSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = createCloseProtectionEngagementSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'createCloseProtectionEngagementAction',
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
			action: 'createCloseProtectionEngagementAction',
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

	const { data: booking, error: bErr } = await supabase
		.from('bookings')
		.select('id')
		.eq('id', parsed.data.bookingId)
		.maybeSingle()

	if (bErr || !booking) {
		logOpsAction({
			action: 'createCloseProtectionEngagementAction',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			bookingId: parsed.data.bookingId,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	const status: CloseProtectionEngagementStatusDb = parsed.data.status ?? 'draft'
	const insertRow = {
		booking_id: parsed.data.bookingId,
		trip_id: null as string | null,
		status,
		coordination_notes: parsed.data.coordinationNotes ?? null,
		created_by: staff.userId,
	}

	const { data: row, error: insErr } = await supabase
		.from('close_protection_engagements')
		.insert(insertRow)
		.select('id')
		.single()

	if (insErr || !row) {
		logOpsAction({
			action: 'createCloseProtectionEngagementAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId: parsed.data.bookingId,
			hint: insErr?.message,
		})
		return buildOpsActionFailure('DATABASE', insErr?.message ?? 'Insert failed', correlationId)
	}

	const engagementId = row.id as string

	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: 'create_close_protection_engagement',
		entity: 'close_protection_engagement',
		entityId: engagementId,
		payload: {
			booking_id: parsed.data.bookingId,
			status,
		},
	})

	revalidatePath('/ops/close-protection')
	revalidatePath(`/ops/close-protection/${engagementId}`)

	logOpsAction({
		action: 'createCloseProtectionEngagementAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		engagementId,
		bookingId: parsed.data.bookingId,
	})
	return { ok: true as const, engagementId }
}

export async function updateCloseProtectionEngagementAction(
	raw: z.infer<typeof updateCloseProtectionEngagementSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = updateCloseProtectionEngagementSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'updateCloseProtectionEngagementAction',
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
			action: 'updateCloseProtectionEngagementAction',
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
	const { engagementId, status, coordinationNotes, tripId } = parsed.data

	const { data: existing, error: exErr } = await supabase
		.from('close_protection_engagements')
		.select('id, booking_id, status, coordination_notes, trip_id')
		.eq('id', engagementId)
		.maybeSingle()

	if (exErr || !existing) {
		logOpsAction({
			action: 'updateCloseProtectionEngagementAction',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			engagementId,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Engagement not found', correlationId)
	}

	const bookingId = existing.booking_id as string

	if (tripId !== undefined && tripId !== null) {
		const linkOk = await assertTripLinkedToBooking(supabase, bookingId, tripId)
		if (!linkOk.ok) {
			logOpsAction({
				action: 'updateCloseProtectionEngagementAction',
				outcome: 'failure',
				level: 'warn',
				correlationId,
				code: 'INVALID_TRIP_LINK',
				engagementId,
				tripId,
				hint: linkOk.message,
			})
			return buildOpsActionFailure('INVALID_TRIP_LINK', linkOk.message, correlationId)
		}
	}

	const patch: Record<string, unknown> = {}
	if (status !== undefined) patch.status = status
	if (coordinationNotes !== undefined) patch.coordination_notes = coordinationNotes
	if (tripId !== undefined) patch.trip_id = tripId

	if (Object.keys(patch).length === 0) {
		logOpsAction({
			action: 'updateCloseProtectionEngagementAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'NO_CHANGES',
			engagementId,
		})
		return buildOpsActionFailure('NO_CHANGES', 'No changes', correlationId)
	}

	const { error: upErr } = await supabase
		.from('close_protection_engagements')
		.update(patch)
		.eq('id', engagementId)

	if (upErr) {
		logOpsAction({
			action: 'updateCloseProtectionEngagementAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			engagementId,
			hint: upErr.message,
		})
		return buildOpsActionFailure('DATABASE', upErr.message, correlationId)
	}

	const fieldsChanged: string[] = []
	if (status !== undefined && status !== existing.status) fieldsChanged.push('status')
	if (coordinationNotes !== undefined && coordinationNotes !== existing.coordination_notes) {
		fieldsChanged.push('coordination_notes')
	}
	if (tripId !== undefined && tripId !== existing.trip_id) fieldsChanged.push('trip_id')

	if (fieldsChanged.length > 0) {
		await appendOpsAuditLog(supabase, {
			actorId: staff.userId,
			actorRole: staffActorRole(staff.role),
			action: 'update_close_protection_engagement',
			entity: 'close_protection_engagement',
			entityId: engagementId,
			payload: {
				booking_id: bookingId,
				fields_changed: fieldsChanged,
			},
		})
	}

	revalidatePath('/ops/close-protection')
	revalidatePath(`/ops/close-protection/${engagementId}`)

	logOpsAction({
		action: 'updateCloseProtectionEngagementAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		engagementId,
		bookingId,
		meta: { fields_changed: fieldsChanged.join(',') },
	})
	return { ok: true as const }
}

export async function listCloseProtectionEngagementsAction(
	raw: z.infer<typeof listCloseProtectionEngagementsSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = listCloseProtectionEngagementsSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'listCloseProtectionEngagementsAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return { ...buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId), rows: [] as const }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'listCloseProtectionEngagementsAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return { ...buildOpsActionFailure('FORBIDDEN', gate.message, correlationId), rows: [] as const }
	}

	const supabase = await createUserServerClient()
	let q = supabase
		.from('close_protection_engagements')
		.select(
			'id, booking_id, trip_id, status, coordination_notes, created_at, updated_at, created_by',
		)
		.order('updated_at', { ascending: false })
		.limit(parsed.data.limit)

	if (parsed.data.bookingId) {
		q = q.eq('booking_id', parsed.data.bookingId)
	}
	if (parsed.data.tripId) {
		q = q.eq('trip_id', parsed.data.tripId)
	}

	const { data, error } = await q

	if (error) {
		logOpsAction({
			action: 'listCloseProtectionEngagementsAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error.message,
		})
		return { ...buildOpsActionFailure('DATABASE', error.message, correlationId), rows: [] as const }
	}

	logOpsAction({
		action: 'listCloseProtectionEngagementsAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		meta: { row_count: (data ?? []).length },
	})
	return { ok: true as const, rows: data ?? [] }
}

export async function getCloseProtectionEngagementByIdAction(
	raw: z.infer<typeof closeProtectionEngagementIdSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = closeProtectionEngagementIdSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'getCloseProtectionEngagementByIdAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return { ...buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId), row: null }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'getCloseProtectionEngagementByIdAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return { ...buildOpsActionFailure('FORBIDDEN', gate.message, correlationId), row: null }
	}

	const supabase = await createUserServerClient()
	const { data, error } = await supabase
		.from('close_protection_engagements')
		.select(
			'id, booking_id, trip_id, status, coordination_notes, created_at, updated_at, created_by',
		)
		.eq('id', parsed.data.engagementId)
		.maybeSingle()

	if (error) {
		logOpsAction({
			action: 'getCloseProtectionEngagementByIdAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error.message,
		})
		return { ...buildOpsActionFailure('DATABASE', error.message, correlationId), row: null }
	}
	if (!data) {
		logOpsAction({
			action: 'getCloseProtectionEngagementByIdAction',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
		})
		return { ...buildOpsActionFailure('NOT_FOUND', 'Engagement not found', correlationId), row: null }
	}

	logOpsAction({
		action: 'getCloseProtectionEngagementByIdAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		engagementId: parsed.data.engagementId,
	})
	return { ok: true as const, row: data }
}

export async function getCloseProtectionEngagementsByBookingIdAction(
	raw: z.infer<typeof closeProtectionBookingIdSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = closeProtectionBookingIdSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'getCloseProtectionEngagementsByBookingIdAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return { ...buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId), rows: [] as const }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'getCloseProtectionEngagementsByBookingIdAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return { ...buildOpsActionFailure('FORBIDDEN', gate.message, correlationId), rows: [] as const }
	}

	const supabase = await createUserServerClient()
	const { data, error } = await supabase
		.from('close_protection_engagements')
		.select(
			'id, booking_id, trip_id, status, coordination_notes, created_at, updated_at, created_by',
		)
		.eq('booking_id', parsed.data.bookingId)
		.order('updated_at', { ascending: false })

	if (error) {
		logOpsAction({
			action: 'getCloseProtectionEngagementsByBookingIdAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error.message,
		})
		return { ...buildOpsActionFailure('DATABASE', error.message, correlationId), rows: [] as const }
	}

	logOpsAction({
		action: 'getCloseProtectionEngagementsByBookingIdAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId: parsed.data.bookingId,
		meta: { row_count: (data ?? []).length },
	})
	return { ok: true as const, rows: data ?? [] }
}
