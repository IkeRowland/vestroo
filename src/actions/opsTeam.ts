'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { getOpsAdminForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { sendOpsTeamMemberInviteEmail } from '@/lib/ops-team-invite-send'
import { absoluteUrl } from '@/lib/site-url'
import { createServiceRoleClient, createUserServerClient } from '@/lib/supabase/server'
import type { ProfileRole } from '@/types/database.types'

const OPS_TEAM_ROLES = ['admin', 'dispatcher'] as const satisfies readonly ProfileRole[]

const inviteTeamMemberSchema = z.object({
	fullName: z.string().trim().min(2).max(120),
	email: z.string().trim().email().max(254),
	phone: z.string().trim().max(40).optional().nullable(),
	role: z.enum(OPS_TEAM_ROLES).default('dispatcher'),
})

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>

const memberIdSchema = z.object({
	memberId: z.string().uuid(),
})

const updateTeamMemberStatusSchema = z.object({
	memberId: z.string().uuid(),
	status: z.enum(['active', 'inactive']),
})

async function upsertTeamMemberProfileRow(
	admin: SupabaseClient,
	params: {
		userId: string
		fullName: string
		email: string
		phone: string | null
		role: (typeof OPS_TEAM_ROLES)[number]
		status: 'active' | 'inactive'
	},
): Promise<{ ok: true } | { ok: false; message: string }> {
	const { error: profileErr } = await admin.from('profiles').upsert(
		{
			id: params.userId,
			full_name: params.fullName,
			email: params.email,
			phone: params.phone ?? '',
			role: params.role,
			status: params.status,
		},
		{ onConflict: 'id' },
	)
	if (profileErr) {
		return { ok: false, message: profileErr.message }
	}
	return { ok: true }
}

function isOpsTeamRole(role: string): role is (typeof OPS_TEAM_ROLES)[number] {
	return (OPS_TEAM_ROLES as readonly string[]).includes(role)
}

type AdminGenerateLinkResponse = {
	user: { id: string } | null
	properties: { action_link?: string }
}

function extractAuthActionLink(data: AdminGenerateLinkResponse | null | undefined): string | null {
	const link = data?.properties?.action_link
	return typeof link === 'string' && link.trim().length > 0 ? link.trim() : null
}

/**
 * Creates or reuses an Auth user and returns a Supabase action link without sending Supabase mail.
 * New users: `invite`; existing: `recovery` (set password / regain access).
 */
async function mintOpsTeamAccessLink(
	admin: SupabaseClient,
	params: {
		email: string
		fullName: string
		phone: string | null
		role: (typeof OPS_TEAM_ROLES)[number]
		isExistingAuthUser: boolean
	},
): Promise<{ ok: true; userId: string; actionLink: string } | { ok: false; message: string }> {
	const redirectTo = absoluteUrl('/ops/login')
	const metadata = {
		full_name: params.fullName,
		phone: params.phone ?? '',
		role: params.role,
	}
	const linkOptions = { redirectTo, data: metadata }

	let data: AdminGenerateLinkResponse | null = null
	let error: { message: string } | null = null

	if (params.isExistingAuthUser) {
		const res = await admin.auth.admin.generateLink({
			type: 'recovery',
			email: params.email,
			options: linkOptions,
		})
		data = res.data as AdminGenerateLinkResponse | null
		error = res.error
	} else {
		const inviteRes = await admin.auth.admin.generateLink({
			type: 'invite',
			email: params.email,
			options: linkOptions,
		})
		data = inviteRes.data as AdminGenerateLinkResponse | null
		error = inviteRes.error
		if (error) {
			const recoveryRes = await admin.auth.admin.generateLink({
				type: 'recovery',
				email: params.email,
				options: linkOptions,
			})
			data = recoveryRes.data as AdminGenerateLinkResponse | null
			error = recoveryRes.error
		}
	}

	if (error) {
		return { ok: false, message: error.message }
	}

	const actionLink = extractAuthActionLink(data as AdminGenerateLinkResponse | null)
	const userId = data?.user?.id ?? null
	if (!actionLink || !userId) {
		return { ok: false, message: 'Could not create invitation link.' }
	}

	return { ok: true, userId, actionLink }
}

export async function inviteTeamMemberAction(raw: InviteTeamMemberInput) {
	const correlationId = newOpsCorrelationId()
	const parsed = inviteTeamMemberSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'inviteTeamMemberAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure(
			'VALIDATION',
			'Please check the name, email, and role.',
			correlationId,
		)
	}

	const gate = await getOpsAdminForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'inviteTeamMemberAction',
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
	const { fullName, email, phone: phoneRaw, role } = parsed.data
	const phone = phoneRaw ?? null

	const { data: existing } = await admin
		.from('profiles')
		.select('id, role')
		.eq('email', email)
		.maybeSingle()

	if (existing?.role && !isOpsTeamRole(existing.role as string)) {
		return buildOpsActionFailure(
			'VALIDATION',
			'This email is already used by a non-staff account.',
			correlationId,
		)
	}

	const isExistingAuthUser = Boolean(existing?.id)
	const minted = await mintOpsTeamAccessLink(admin, {
		email,
		fullName,
		phone,
		role,
		isExistingAuthUser,
	})
	if (!minted.ok) {
		logOpsAction({
			action: 'inviteTeamMemberAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'AUTH_INVITE_FAILED',
			hint: minted.message,
		})
		return buildOpsActionFailure('AUTH_INVITE_FAILED', minted.message, correlationId)
	}

	const userId = minted.userId

	const profile = await upsertTeamMemberProfileRow(admin, {
		userId,
		fullName,
		email,
		phone,
		role,
		status: 'active',
	})
	if (!profile.ok) {
		logOpsAction({
			action: 'inviteTeamMemberAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: profile.message,
		})
		return buildOpsActionFailure('DATABASE', profile.message, correlationId)
	}

	const emailSent = await sendOpsTeamMemberInviteEmail({
		supabase: admin,
		to: email,
		role,
		inviterUserId: gate.session.userId,
		acceptInviteAbsoluteUrl: minted.actionLink,
		idempotencyUserId: userId,
	})
	if (!emailSent.ok) {
		logOpsAction({
			action: 'inviteTeamMemberAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'EMAIL_SEND_FAILED',
			hint: emailSent.message,
			entityId: userId,
		})
		return buildOpsActionFailure('EMAIL_SEND_FAILED', emailSent.message, correlationId)
	}

	await appendOpsAuditLog(userServer, {
		actorId: gate.session.userId,
		actorRole: 'admin',
		action: 'invite_team_member',
		entity: 'profile',
		entityId: userId,
		payload: { email, full_name: fullName, role },
	})

	revalidatePath('/ops/team')
	revalidatePath(`/ops/team/${userId}`)

	logOpsAction({
		action: 'inviteTeamMemberAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: userId,
	})
	return { ok: true as const, memberId: userId }
}

export async function updateTeamMemberStatusAction(
	raw: z.infer<typeof updateTeamMemberStatusSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = updateTeamMemberStatusSchema.safeParse(raw)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid request', correlationId)
	}

	const gate = await getOpsAdminForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const { memberId, status } = parsed.data

	const { data: existing, error: exErr } = await supabase
		.from('profiles')
		.select('id, role')
		.eq('id', memberId)
		.maybeSingle()

	if (exErr || !existing || !isOpsTeamRole(existing.role as string)) {
		return buildOpsActionFailure('NOT_FOUND', 'Team member not found', correlationId)
	}

	const { error } = await supabase
		.from('profiles')
		.update({ status })
		.eq('id', memberId)
		.in('role', [...OPS_TEAM_ROLES])

	if (error) {
		logOpsAction({
			action: 'updateTeamMemberStatusAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: memberId,
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		actorRole: 'admin',
		action: status === 'active' ? 'activate_team_member' : 'deactivate_team_member',
		entity: 'profile',
		entityId: memberId,
		payload: { status },
	})

	revalidatePath('/ops/team')
	revalidatePath(`/ops/team/${memberId}`)

	logOpsAction({
		action: 'updateTeamMemberStatusAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: memberId,
	})
	return { ok: true as const }
}

export async function deleteTeamMemberAction(raw: z.infer<typeof memberIdSchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = memberIdSchema.safeParse(raw)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid member id', correlationId)
	}

	const gate = await getOpsAdminForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const { memberId } = parsed.data
	if (memberId === gate.session.userId) {
		return buildOpsActionFailure(
			'VALIDATION',
			'You cannot remove your own account.',
			correlationId,
		)
	}

	const admin = await createServiceRoleClient()
	const userServer = await createUserServerClient()

	const { data: target, error: targetErr } = await admin
		.from('profiles')
		.select('id, role, email, full_name')
		.eq('id', memberId)
		.maybeSingle()

	if (targetErr || !target || !isOpsTeamRole(target.role as string)) {
		return buildOpsActionFailure('NOT_FOUND', 'Team member not found', correlationId)
	}

	if (target.role === 'admin') {
		const { count, error: countErr } = await admin
			.from('profiles')
			.select('id', { count: 'exact', head: true })
			.eq('role', 'admin')

		if (countErr) {
			return buildOpsActionFailure('DATABASE', countErr.message, correlationId)
		}
		if ((count ?? 0) <= 1) {
			return buildOpsActionFailure(
				'VALIDATION',
				'Cannot remove the last platform admin.',
				correlationId,
			)
		}
	}

	const { error: delErr } = await admin.auth.admin.deleteUser(memberId)
	if (delErr) {
		logOpsAction({
			action: 'deleteTeamMemberAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'AUTH_DELETE_FAILED',
			entityId: memberId,
			hint: delErr.message,
		})
		return buildOpsActionFailure(
			'AUTH_DELETE_FAILED',
			delErr.message ?? 'Could not remove member.',
			correlationId,
		)
	}

	await appendOpsAuditLog(userServer, {
		actorId: gate.session.userId,
		actorRole: 'admin',
		action: 'delete_team_member',
		entity: 'profile',
		entityId: memberId,
		payload: {
			email: target.email,
			full_name: target.full_name,
			role: target.role,
		},
	})

	revalidatePath('/ops/team')

	logOpsAction({
		action: 'deleteTeamMemberAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: memberId,
	})
	return { ok: true as const }
}
