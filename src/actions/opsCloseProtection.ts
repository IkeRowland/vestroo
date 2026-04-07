'use server'

import { revalidatePath } from 'next/cache'
import type { z } from 'zod'

import { appendOpsAuditLog } from '@/lib/ops-audit'
import {
	closeProtectionBookingIdSchema,
	closeProtectionEngagementIdSchema,
	createCloseProtectionEngagementSchema,
	listCloseProtectionEngagementsSchema,
	updateCloseProtectionEngagementSchema,
} from '@/lib/ops-close-protection-schemas'
import { getOpsStaffForAction } from '@/lib/ops-auth'
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
	const parsed = createCloseProtectionEngagementSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
	}
	const staff = gate.session
	const supabase = await createUserServerClient()

	const { data: booking, error: bErr } = await supabase
		.from('bookings')
		.select('id')
		.eq('id', parsed.data.bookingId)
		.maybeSingle()

	if (bErr || !booking) {
		return { ok: false as const, message: 'Booking not found' }
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
		return { ok: false as const, message: insErr?.message ?? 'Insert failed' }
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

	return { ok: true as const, engagementId }
}

export async function updateCloseProtectionEngagementAction(
	raw: z.infer<typeof updateCloseProtectionEngagementSchema>,
) {
	const parsed = updateCloseProtectionEngagementSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
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
		return { ok: false as const, message: 'Engagement not found' }
	}

	const bookingId = existing.booking_id as string

	if (tripId !== undefined && tripId !== null) {
		const linkOk = await assertTripLinkedToBooking(supabase, bookingId, tripId)
		if (!linkOk.ok) {
			return { ok: false as const, message: linkOk.message }
		}
	}

	const patch: Record<string, unknown> = {}
	if (status !== undefined) patch.status = status
	if (coordinationNotes !== undefined) patch.coordination_notes = coordinationNotes
	if (tripId !== undefined) patch.trip_id = tripId

	if (Object.keys(patch).length === 0) {
		return { ok: false as const, message: 'No changes' }
	}

	const { error: upErr } = await supabase
		.from('close_protection_engagements')
		.update(patch)
		.eq('id', engagementId)

	if (upErr) {
		return { ok: false as const, message: upErr.message }
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

	return { ok: true as const }
}

export async function listCloseProtectionEngagementsAction(
	raw: z.infer<typeof listCloseProtectionEngagementsSchema>,
) {
	const parsed = listCloseProtectionEngagementsSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload', rows: [] as const }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message, rows: [] as const }
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
		return { ok: false as const, message: error.message, rows: [] as const }
	}

	return { ok: true as const, rows: data ?? [] }
}

export async function getCloseProtectionEngagementByIdAction(
	raw: z.infer<typeof closeProtectionEngagementIdSchema>,
) {
	const parsed = closeProtectionEngagementIdSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload', row: null }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message, row: null }
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
		return { ok: false as const, message: error.message, row: null }
	}
	if (!data) {
		return { ok: false as const, message: 'Engagement not found', row: null }
	}

	return { ok: true as const, row: data }
}

export async function getCloseProtectionEngagementsByBookingIdAction(
	raw: z.infer<typeof closeProtectionBookingIdSchema>,
) {
	const parsed = closeProtectionBookingIdSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload', rows: [] as const }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message, rows: [] as const }
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
		return { ok: false as const, message: error.message, rows: [] as const }
	}

	return { ok: true as const, rows: data ?? [] }
}
