'use server'

import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { OPS_DRIVER_AVATAR_OBJECT_POSITIONS } from '@/features/ops/lib/ops-driver-avatar-display'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { createServiceRoleClient, createUserServerClient } from '@/lib/supabase/server'
import type { OpsAuditActorRoleDb } from '@/types/database.types'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

const updateFleetDriverSchema = z.object({
	profileId: z.string().uuid(),
	fullName: z.string().trim().min(2).max(120),
	phone: z.string().trim().max(40).optional().nullable(),
	status: z.enum(['active', 'inactive']),
	defaultVehicleId: z.string().uuid().nullable(),
})

const archiveFleetDriverSchema = z.object({
	profileId: z.string().uuid(),
})

/** Same bucket as account portal avatars; ops uploads use service role under the driver profile id prefix. */
const OPS_DRIVER_AVATAR_BUCKET = 'account_profile_avatars' as const
const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const allowedAvatarMime = new Set(['image/jpeg', 'image/png', 'image/webp'])

const updateAvatarPositionSchema = z.object({
	profileId: z.string().uuid(),
	objectPosition: z.enum(OPS_DRIVER_AVATAR_OBJECT_POSITIONS),
})

const driverProfileIdSchema = z.object({
	profileId: z.string().uuid(),
})

function extForMime(mime: string): string | null {
	if (mime === 'image/jpeg') return 'jpg'
	if (mime === 'image/png') return 'png'
	if (mime === 'image/webp') return 'webp'
	return null
}

/** Object path within **`account_profile_avatars`** (no bucket prefix), or **`null`** if URL is not ours. */
function accountProfileAvatarObjectPathFromPublicUrl(url: string): string | null {
	const t = url.trim()
	const marker = '/storage/v1/object/public/account_profile_avatars/'
	const idx = t.indexOf(marker)
	if (idx === -1) return null
	const rest = t.slice(idx + marker.length)
	return rest.length > 0 ? rest : null
}

export type OpsDriverFleetActionSuccess = { ok: true }
export type OpsDriverFleetActionResult = OpsDriverFleetActionSuccess | ReturnType<typeof buildOpsActionFailure>

export async function updateOpsFleetDriverAction(
	raw: z.infer<typeof updateFleetDriverSchema>,
): Promise<OpsDriverFleetActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = updateFleetDriverSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'update_ops_fleet_driver',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Check driver fields', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const p = parsed.data

	const { data: existing, error: exErr } = await supabase
		.from('profiles')
		.select('id, role')
		.eq('id', p.profileId)
		.maybeSingle()

	if (exErr || !existing || existing.role !== PROFILE_ROLE_OPS_DRIVER_DB) {
		return buildOpsActionFailure('NOT_FOUND', 'Driver profile not found', correlationId)
	}

	if (p.defaultVehicleId) {
		const { data: v, error: vErr } = await supabase
			.from('vehicles')
			.select('id')
			.eq('id', p.defaultVehicleId)
			.maybeSingle()
		if (vErr || !v) {
			return buildOpsActionFailure('VALIDATION', 'Default vehicle not found', correlationId)
		}
	}

	const { error } = await supabase
		.from('profiles')
		.update({
			full_name: p.fullName,
			phone: p.phone ?? '',
			status: p.status,
			default_vehicle_id: p.defaultVehicleId,
		})
		.eq('id', p.profileId)
		.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)

	if (error) {
		logOpsAction({
			action: 'update_ops_fleet_driver',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: p.profileId,
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		actorRole: gate.session.role as OpsAuditActorRoleDb,
		action: 'update_fleet_driver',
		entity: 'profile',
		entityId: p.profileId,
		payload: {
			full_name: p.fullName,
			status: p.status,
			default_vehicle_id: p.defaultVehicleId,
		},
	})

	revalidatePath('/ops/fleet/drivers')
	revalidatePath('/ops/trips')

	logOpsAction({
		action: 'update_ops_fleet_driver',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: p.profileId,
	})
	return { ok: true }
}

/** Sets driver profile **`status`** to **`inactive`** (removed from active dispatch lists). */
export async function archiveOpsFleetDriverAction(
	raw: z.infer<typeof archiveFleetDriverSchema>,
): Promise<OpsDriverFleetActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = archiveFleetDriverSchema.safeParse(raw)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid driver id', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const { profileId } = parsed.data

	const { data: existing, error: exErr } = await supabase
		.from('profiles')
		.select('id, role, status')
		.eq('id', profileId)
		.maybeSingle()

	if (exErr || !existing || existing.role !== PROFILE_ROLE_OPS_DRIVER_DB) {
		return buildOpsActionFailure('NOT_FOUND', 'Driver profile not found', correlationId)
	}

	if (existing.status === 'inactive') {
		return buildOpsActionFailure('VALIDATION', 'Driver is already archived', correlationId)
	}

	const { error } = await supabase
		.from('profiles')
		.update({ status: 'inactive' })
		.eq('id', profileId)
		.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)

	if (error) {
		logOpsAction({
			action: 'archive_ops_fleet_driver',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: profileId,
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		actorRole: gate.session.role as OpsAuditActorRoleDb,
		action: 'archive_fleet_driver',
		entity: 'profile',
		entityId: profileId,
		payload: {},
	})

	revalidatePath('/ops/fleet/drivers')
	revalidatePath('/ops/trips')

	logOpsAction({
		action: 'archive_ops_fleet_driver',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: profileId,
	})
	return { ok: true }
}

export async function uploadOpsFleetDriverAvatarAction(input: {
	profileId: string
	file: File
}): Promise<OpsDriverFleetActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsedId = driverProfileIdSchema.safeParse({ profileId: input.profileId })
	if (!parsedId.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid driver id', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const file = input.file
	if (!(file instanceof File) || file.size === 0) {
		return buildOpsActionFailure('VALIDATION', 'Choose an image file', correlationId)
	}
	if (file.size > AVATAR_MAX_BYTES) {
		return buildOpsActionFailure('VALIDATION', 'Image must be 2 MB or smaller', correlationId)
	}
	const mime = file.type
	if (!allowedAvatarMime.has(mime)) {
		return buildOpsActionFailure('VALIDATION', 'Use JPEG, PNG, or WebP', correlationId)
	}
	const ext = extForMime(mime)
	if (!ext) {
		return buildOpsActionFailure('VALIDATION', 'Use JPEG, PNG, or WebP', correlationId)
	}

	const supabase = await createUserServerClient()
	const profileId = parsedId.data.profileId

	const { data: existing, error: exErr } = await supabase
		.from('profiles')
		.select('id, role, avatar_url')
		.eq('id', profileId)
		.maybeSingle()

	if (exErr || !existing || existing.role !== PROFILE_ROLE_OPS_DRIVER_DB) {
		return buildOpsActionFailure('NOT_FOUND', 'Driver profile not found', correlationId)
	}

	let admin: Awaited<ReturnType<typeof createServiceRoleClient>>
	try {
		admin = await createServiceRoleClient()
	} catch (e) {
		const hint = e instanceof Error ? e.message : String(e)
		return buildOpsActionFailure('DATABASE', hint || 'Server configuration error', correlationId)
	}

	const prevUrl =
		typeof existing.avatar_url === 'string' && existing.avatar_url.trim().length > 0
			? existing.avatar_url.trim()
			: null
	const prevPath = prevUrl ? accountProfileAvatarObjectPathFromPublicUrl(prevUrl) : null

	const objectPath = `${profileId}/${randomUUID()}.${ext}`
	const buf = Buffer.from(await file.arrayBuffer())

	const { error: upErr } = await admin.storage
		.from(OPS_DRIVER_AVATAR_BUCKET)
		.upload(objectPath, buf, {
			contentType: mime,
			upsert: false,
		})

	if (upErr) {
		logOpsAction({
			action: 'upload_ops_fleet_driver_avatar',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'STORAGE',
			entityId: profileId,
			hint: upErr.message,
		})
		return buildOpsActionFailure('DATABASE', upErr.message, correlationId)
	}

	const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
	if (!base) {
		return buildOpsActionFailure('DATABASE', 'Missing NEXT_PUBLIC_SUPABASE_URL', correlationId)
	}
	const publicUrl = `${base}/storage/v1/object/public/${OPS_DRIVER_AVATAR_BUCKET}/${objectPath}`

	const { error: profErr } = await admin
		.from('profiles')
		.update({ avatar_url: publicUrl, avatar_object_position: 'center' })
		.eq('id', profileId)
		.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)

	if (profErr) {
		await admin.storage.from(OPS_DRIVER_AVATAR_BUCKET).remove([objectPath])
		return buildOpsActionFailure('DATABASE', profErr.message, correlationId)
	}

	if (prevPath) {
		await admin.storage.from(OPS_DRIVER_AVATAR_BUCKET).remove([prevPath])
	}

	await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		actorRole: gate.session.role as OpsAuditActorRoleDb,
		action: 'update_fleet_driver_avatar',
		entity: 'profile',
		entityId: profileId,
		payload: {},
	})

	revalidatePath('/ops/fleet/drivers')
	revalidatePath('/ops/trips')

	logOpsAction({
		action: 'upload_ops_fleet_driver_avatar',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: profileId,
	})
	return { ok: true }
}

export async function clearOpsFleetDriverAvatarAction(
	raw: z.infer<typeof driverProfileIdSchema>,
): Promise<OpsDriverFleetActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = driverProfileIdSchema.safeParse(raw)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid driver id', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const { profileId } = parsed.data

	const { data: existing, error: exErr } = await supabase
		.from('profiles')
		.select('id, role, avatar_url')
		.eq('id', profileId)
		.maybeSingle()

	if (exErr || !existing || existing.role !== PROFILE_ROLE_OPS_DRIVER_DB) {
		return buildOpsActionFailure('NOT_FOUND', 'Driver profile not found', correlationId)
	}

	const prevUrl =
		typeof existing.avatar_url === 'string' && existing.avatar_url.trim().length > 0
			? existing.avatar_url.trim()
			: null
	const prevPath = prevUrl ? accountProfileAvatarObjectPathFromPublicUrl(prevUrl) : null

	let admin: Awaited<ReturnType<typeof createServiceRoleClient>> | null = null
	if (prevPath) {
		try {
			admin = await createServiceRoleClient()
		} catch {
			admin = null
		}
		if (admin) {
			await admin.storage.from(OPS_DRIVER_AVATAR_BUCKET).remove([prevPath])
		}
	}

	const client = admin ?? (await createUserServerClient())
	const { error } = await client
		.from('profiles')
		.update({ avatar_url: null, avatar_object_position: 'center' })
		.eq('id', profileId)
		.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)

	if (error) {
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		actorRole: gate.session.role as OpsAuditActorRoleDb,
		action: 'clear_fleet_driver_avatar',
		entity: 'profile',
		entityId: profileId,
		payload: {},
	})

	revalidatePath('/ops/fleet/drivers')
	revalidatePath('/ops/trips')

	logOpsAction({
		action: 'clear_ops_fleet_driver_avatar',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: profileId,
	})
	return { ok: true }
}

export async function updateOpsFleetDriverAvatarPositionAction(
	raw: z.infer<typeof updateAvatarPositionSchema>,
): Promise<OpsDriverFleetActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = updateAvatarPositionSchema.safeParse(raw)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid alignment', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const { profileId, objectPosition } = parsed.data

	const { data: existing, error: exErr } = await supabase
		.from('profiles')
		.select('id, role, avatar_url')
		.eq('id', profileId)
		.maybeSingle()

	if (exErr || !existing || existing.role !== PROFILE_ROLE_OPS_DRIVER_DB) {
		return buildOpsActionFailure('NOT_FOUND', 'Driver profile not found', correlationId)
	}

	const hasAvatar =
		typeof existing.avatar_url === 'string' && existing.avatar_url.trim().length > 0
	if (!hasAvatar) {
		return buildOpsActionFailure('VALIDATION', 'Add a photo before adjusting alignment', correlationId)
	}

	const { error } = await supabase
		.from('profiles')
		.update({ avatar_object_position: objectPosition })
		.eq('id', profileId)
		.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)

	if (error) {
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		actorRole: gate.session.role as OpsAuditActorRoleDb,
		action: 'update_fleet_driver_avatar_position',
		entity: 'profile',
		entityId: profileId,
		payload: { avatar_object_position: objectPosition },
	})

	revalidatePath('/ops/fleet/drivers')
	revalidatePath('/ops/trips')

	logOpsAction({
		action: 'update_ops_fleet_driver_avatar_position',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: profileId,
	})
	return { ok: true }
}
