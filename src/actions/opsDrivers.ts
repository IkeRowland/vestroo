'use server'

import { randomBytes } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { getOpsAdminForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import {
	createServiceRoleClient,
	createUserServerClient,
} from '@/lib/supabase/server'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

const inviteDriverSchema = z.object({
	fullName: z.string().trim().min(2).max(120),
	email: z.string().trim().email().max(254),
	phone: z.string().trim().max(40).optional().nullable(),
})

export type InviteDriverInput = z.infer<typeof inviteDriverSchema>

function randomBootstrapPassword(): string {
	// GoTrue defaults allow long passwords; mix alnum + symbols for typical policy checks.
	const core = randomBytes(28).toString('base64url')
	return `${core}Aa1!`
}

async function upsertDriverProfileRow(
	admin: SupabaseClient,
	params: {
		userId: string
		fullName: string
		email: string
		phone: string | null
	},
): Promise<{ ok: true } | { ok: false; message: string }> {
	const { error: profileErr } = await admin.from('profiles').upsert(
		{
			id: params.userId,
			full_name: params.fullName,
			email: params.email,
			phone: params.phone ?? '',
			role: PROFILE_ROLE_OPS_DRIVER_DB,
			status: 'active',
		},
		{ onConflict: 'id' },
	)
	if (profileErr) {
		return { ok: false, message: profileErr.message }
	}
	return { ok: true }
}

export async function inviteDriverAction(raw: InviteDriverInput) {
	const correlationId = newOpsCorrelationId()
	const parsed = inviteDriverSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'inviteDriverAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure(
			'VALIDATION',
			'Please check the driver name and email.',
			correlationId,
		)
	}

	const gate = await getOpsAdminForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'inviteDriverAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const admin = await createServiceRoleClient()
	const userServer = await createUserServerClient()
	const { fullName, email, phone: phoneRaw } = parsed.data
	const phone = phoneRaw ?? null

	const { data: existing } = await admin
		.from('profiles')
		.select('id, role')
		.eq('email', email)
		.maybeSingle()

	let userId: string | null = (existing?.id as string | null) ?? null

	if (!userId) {
		const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(
			email,
			{
				data: {
					full_name: fullName,
					phone: phone ?? '',
					role: PROFILE_ROLE_OPS_DRIVER_DB,
				},
			},
		)
		if (invErr || !invited?.user?.id) {
			logOpsAction({
				action: 'inviteDriverAction',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'AUTH_INVITE_FAILED',
				hint: invErr?.message,
			})
			return buildOpsActionFailure(
				'AUTH_INVITE_FAILED',
				invErr?.message ?? 'Could not send invitation.',
				correlationId,
			)
		}
		userId = invited.user.id
	}

	const profile = await upsertDriverProfileRow(admin, {
		userId,
		fullName,
		email,
		phone,
	})
	if (!profile.ok) {
		logOpsAction({
			action: 'inviteDriverAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: profile.message,
		})
		return buildOpsActionFailure('DATABASE', profile.message, correlationId)
	}

	await appendOpsAuditLog(userServer, {
		actorId: gate.session.userId,
		actorRole: 'admin',
		action: 'invite_driver',
		entity: 'profile',
		entityId: userId,
		payload: { email, full_name: fullName },
	})

	revalidatePath('/ops/fleet/drivers')

	logOpsAction({
		action: 'inviteDriverAction',
		outcome: 'success',
		level: 'info',
		correlationId,
	})
	return { ok: true as const, driverId: userId }
}

/**
 * Creates an **auth user + driver profile** without sending Supabase’s invite email.
 * The password is random and unknown to anyone — the driver can sign in later via **Forgot password** on the login page.
 */
export async function createDriverWithoutInviteAction(raw: InviteDriverInput) {
	const correlationId = newOpsCorrelationId()
	const parsed = inviteDriverSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'createDriverWithoutInviteAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure(
			'VALIDATION',
			'Please check the driver name and email.',
			correlationId,
		)
	}

	const gate = await getOpsAdminForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'createDriverWithoutInviteAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const admin = await createServiceRoleClient()
	const userServer = await createUserServerClient()
	const { fullName, email, phone: phoneRaw } = parsed.data
	const phone = phoneRaw ?? null

	const { data: existing } = await admin
		.from('profiles')
		.select('id, role')
		.eq('email', email)
		.maybeSingle()

	let userId: string | null = (existing?.id as string | null) ?? null

	if (!userId) {
		const { data: created, error: createErr } = await admin.auth.admin.createUser({
			email,
			password: randomBootstrapPassword(),
			email_confirm: true,
			user_metadata: {
				full_name: fullName,
				phone: phone ?? '',
				role: PROFILE_ROLE_OPS_DRIVER_DB,
			},
		})
		if (createErr || !created?.user?.id) {
			logOpsAction({
				action: 'createDriverWithoutInviteAction',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'AUTH_CREATE_FAILED',
				hint: createErr?.message,
			})
			return buildOpsActionFailure(
				'AUTH_CREATE_FAILED',
				createErr?.message ?? 'Could not create the driver account.',
				correlationId,
			)
		}
		userId = created.user.id
	}

	const profile = await upsertDriverProfileRow(admin, {
		userId,
		fullName,
		email,
		phone,
	})
	if (!profile.ok) {
		logOpsAction({
			action: 'createDriverWithoutInviteAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: profile.message,
		})
		return buildOpsActionFailure('DATABASE', profile.message, correlationId)
	}

	await appendOpsAuditLog(userServer, {
		actorId: gate.session.userId,
		actorRole: 'admin',
		action: 'add_driver_no_invite',
		entity: 'profile',
		entityId: userId,
		payload: { email, full_name: fullName },
	})

	revalidatePath('/ops/fleet/drivers')

	logOpsAction({
		action: 'createDriverWithoutInviteAction',
		outcome: 'success',
		level: 'info',
		correlationId,
	})
	return { ok: true as const, driverId: userId }
}
