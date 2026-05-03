'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'

import {
	countAcceptedAdmins,
	isAcceptedAdminRow,
	lastAdminBlockedMessage,
	loadAccountMemberRows,
	type AccountMemberRow,
} from '@/lib/account-members-admin'
import {
	ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE,
	getActiveAccountCookieOptions,
	loadActiveCustomerAccountForPortal,
	loadEligibleMemberships,
	resolveActiveAccountForPortal,
} from '@/lib/account-portal-auth'
import { rotateInviteTokenAndSendEmail } from '@/lib/account-invite-send'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { createUserServerClient } from '@/lib/supabase/server'

const inviteEmailSchema = z.string().trim().email().max(320)
const memberRowEmailKeySchema = z.string().trim().min(1).max(320)
const roleSchema = z.enum(['admin', 'booker', 'rider'])

/** Shared state for `useActionState` on account member mutations. */
export type AccountMembersActionState =
	| { ok: true; message: string | null }
	| { ok: false; message: string }

export const initialAccountMembersActionState: AccountMembersActionState = { ok: true, message: null }

async function requirePortalAdminSession(): Promise<
	| { ok: true; supabase: Awaited<ReturnType<typeof createUserServerClient>>; userId: string; activeAccountId: string }
	| { ok: false }
> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user) {
		return { ok: false }
	}
	const memberships = await loadEligibleMemberships(user.id)
	if (memberships.length === 0) {
		return { ok: false }
	}
	const cookieStore = await cookies()
	const cookieVal = cookieStore.get(ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE)?.value
	const { activeAccountId } = resolveActiveAccountForPortal(memberships, cookieVal)
	const role = memberships.find((m) => m.accountId === activeAccountId)?.role
	if (role !== 'admin') {
		return { ok: false }
	}
	return { ok: true, supabase, userId: user.id, activeAccountId }
}

/** Non-admin → generic message (avoid leaking route intent). */
function handleAuthError(): { ok: false; message: string } {
	return { ok: false, message: 'You do not have permission to manage members for this account.' }
}

async function auditPortalMemberChange(
	supabase: Awaited<ReturnType<typeof createUserServerClient>>,
	userId: string,
	activeAccountId: string,
	action: 'account_member_invited' | 'account_member_role_changed' | 'account_member_removed',
	payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; message: string }> {
	return appendOpsAuditLog(supabase, {
		actorId: userId,
		actorRole: 'account_portal',
		action,
		entity: 'customer_account_members',
		entityId: activeAccountId,
		payload: { account_id: activeAccountId, ...payload },
	})
}

export async function inviteAccountMemberAction(
	_prev: AccountMembersActionState,
	formData: FormData,
): Promise<AccountMembersActionState> {
	const gate = await requirePortalAdminSession()
	if (!gate.ok) {
		return handleAuthError()
	}
	const { supabase, userId, activeAccountId } = gate

	const parsedEmail = inviteEmailSchema.safeParse(formData.get('email') ?? '')
	const parsedRole = roleSchema.safeParse(formData.get('role') ?? '')
	if (!parsedEmail.success) {
		return { ok: false, message: 'Enter a valid email address.' }
	}
	if (!parsedRole.success) {
		return { ok: false, message: 'Choose a valid role.' }
	}

	const email = parsedEmail.data.toLowerCase()

	const { rows } = await loadAccountMemberRows(supabase, activeAccountId)
	const already = rows.some((r) => r.email.toLowerCase() === email)
	if (already) {
		return { ok: false, message: 'This email is already listed for this account.' }
	}

	const { error: insertErr } = await supabase.from('customer_account_members').insert({
		account_id: activeAccountId,
		email,
		role: parsedRole.data,
		profile_id: null,
		accepted_at: null,
		invited_at: new Date().toISOString(),
	})

	if (insertErr) {
		if (insertErr.code === '23505') {
			return { ok: false, message: 'This email is already listed for this account.' }
		}
		return { ok: false, message: insertErr.message }
	}

	const audit = await auditPortalMemberChange(supabase, userId, activeAccountId, 'account_member_invited', {
		target_email: email,
		role: parsedRole.data,
	})
	if (!audit.ok) {
		await supabase
			.from('customer_account_members')
			.delete()
			.eq('account_id', activeAccountId)
			.eq('email', email)
		return { ok: false, message: 'Could not record audit log; invite was rolled back. Try again.' }
	}

	const accountRow = await loadActiveCustomerAccountForPortal(activeAccountId)
	const accountName = accountRow?.name ?? 'Your organisation'

	const emailResult = await rotateInviteTokenAndSendEmail({
		supabase,
		accountId: activeAccountId,
		memberEmailDb: email,
		memberRole: parsedRole.data,
		accountName,
		inviterUserId: userId,
		enforceCooldown: false,
		lastSentAtIso: null,
	})

	let msg = 'Invite saved.'
	if (emailResult.ok) {
		msg =
			emailResult.mode === 'skipped_test_mode'
				? 'Invite saved. Email skipped (Resend test key / non-production).'
				: 'Invite saved and invitation email sent.'
	} else {
		msg = `Invite saved. ${emailResult.message}`
	}

	revalidatePath('/account/members')
	revalidatePath('/account', 'layout')
	return { ok: true, message: msg }
}

export async function resendAccountMemberInviteAction(
	_prev: AccountMembersActionState,
	formData: FormData,
): Promise<AccountMembersActionState> {
	const gate = await requirePortalAdminSession()
	if (!gate.ok) {
		return handleAuthError()
	}
	const { supabase, userId, activeAccountId } = gate

	const parsedKey = memberRowEmailKeySchema.safeParse(formData.get('email') ?? '')
	if (!parsedKey.success) {
		return { ok: false, message: 'Invalid member.' }
	}

	const { rows, error: loadErr } = await loadAccountMemberRows(supabase, activeAccountId)
	if (loadErr) {
		return { ok: false, message: loadErr }
	}
	const row = rows.find((r) => r.email === parsedKey.data)
	if (!row) {
		return { ok: false, message: 'Member not found.' }
	}
	if (row.accepted_at !== null) {
		return { ok: false, message: 'This member has already accepted.' }
	}

	const accountRow = await loadActiveCustomerAccountForPortal(activeAccountId)
	const accountName = accountRow?.name ?? 'Your organisation'

	const emailResult = await rotateInviteTokenAndSendEmail({
		supabase,
		accountId: activeAccountId,
		memberEmailDb: row.email,
		memberRole: row.role,
		accountName,
		inviterUserId: userId,
		enforceCooldown: true,
		lastSentAtIso: row.invite_email_last_sent_at,
	})

	if (!emailResult.ok) {
		return { ok: false, message: emailResult.message }
	}

	const msg =
		emailResult.mode === 'skipped_test_mode'
			? 'Resend skipped (Resend test key / non-production).'
			: 'Invitation email sent again.'

	revalidatePath('/account/members')
	revalidatePath('/account', 'layout')
	return { ok: true, message: msg }
}

export async function updateAccountMemberRoleAction(
	_prev: AccountMembersActionState,
	formData: FormData,
): Promise<AccountMembersActionState> {
	const gate = await requirePortalAdminSession()
	if (!gate.ok) {
		return handleAuthError()
	}
	const { supabase, userId, activeAccountId } = gate

	const parsedKey = memberRowEmailKeySchema.safeParse(formData.get('email') ?? '')
	const parsedRole = roleSchema.safeParse(formData.get('role') ?? '')
	if (!parsedKey.success || !parsedRole.success) {
		return { ok: false, message: 'Invalid member or role.' }
	}

	const { rows, error: loadErr } = await loadAccountMemberRows(supabase, activeAccountId)
	if (loadErr) {
		return { ok: false, message: loadErr }
	}
	const row = rows.find((r) => r.email === parsedKey.data)
	if (!row) {
		return { ok: false, message: 'Member not found.' }
	}

	const oldRole = row.role
	if (oldRole === parsedRole.data) {
		return { ok: true, message: null }
	}

	if (isAcceptedAdminRow(row) && parsedRole.data !== 'admin') {
		const admins = await countAcceptedAdmins(supabase, activeAccountId)
		if (admins <= 1) {
			return { ok: false, message: lastAdminBlockedMessage() }
		}
	}

	const { error: updErr } = await supabase
		.from('customer_account_members')
		.update({ role: parsedRole.data })
		.eq('account_id', activeAccountId)
		.eq('email', row.email)

	if (updErr) {
		return { ok: false, message: updErr.message }
	}

	const audit = await auditPortalMemberChange(
		supabase,
		userId,
		activeAccountId,
		'account_member_role_changed',
		{
			target_email: row.email,
			previous_role: oldRole,
			new_role: parsedRole.data,
		},
	)
	if (!audit.ok) {
		await supabase
			.from('customer_account_members')
			.update({ role: oldRole })
			.eq('account_id', activeAccountId)
			.eq('email', row.email)
		return { ok: false, message: 'Could not record audit log; role change was rolled back. Try again.' }
	}

	revalidatePath('/account/members')
	revalidatePath('/account', 'layout')
	return { ok: true, message: null }
}

export async function removeAccountMemberAction(
	_prev: AccountMembersActionState,
	formData: FormData,
): Promise<AccountMembersActionState> {
	const gate = await requirePortalAdminSession()
	if (!gate.ok) {
		return handleAuthError()
	}
	const { supabase, userId, activeAccountId } = gate

	const parsedKey = memberRowEmailKeySchema.safeParse(formData.get('email') ?? '')
	if (!parsedKey.success) {
		return { ok: false, message: 'Invalid member.' }
	}

	const { rows, error: loadErr } = await loadAccountMemberRows(supabase, activeAccountId)
	if (loadErr) {
		return { ok: false, message: loadErr }
	}
	const row = rows.find((r) => r.email === parsedKey.data)
	if (!row) {
		return { ok: false, message: 'Member not found.' }
	}

	if (isAcceptedAdminRow(row)) {
		const admins = await countAcceptedAdmins(supabase, activeAccountId)
		if (admins <= 1) {
			return { ok: false, message: lastAdminBlockedMessage() }
		}
	}

	const snapshot: AccountMemberRow = { ...row }

	const { error: delErr } = await supabase
		.from('customer_account_members')
		.delete()
		.eq('account_id', activeAccountId)
		.eq('email', row.email)

	if (delErr) {
		return { ok: false, message: delErr.message }
	}

	const audit = await auditPortalMemberChange(supabase, userId, activeAccountId, 'account_member_removed', {
		target_email: row.email,
		removed_role: snapshot.role,
		had_profile_id: snapshot.profile_id !== null,
		accepted_at_was_set: snapshot.accepted_at !== null,
	})
	if (!audit.ok) {
		const { error: restoreErr } = await supabase.from('customer_account_members').insert({
			account_id: snapshot.account_id,
			email: snapshot.email,
			profile_id: snapshot.profile_id,
			full_name: snapshot.full_name,
			role: snapshot.role,
			invited_at: snapshot.invited_at,
			accepted_at: snapshot.accepted_at,
		})
		if (restoreErr) {
			return {
				ok: false,
				message:
					'Member was removed but audit logging failed and automatic restore failed. Contact support with this timestamp.',
			}
		}
		return { ok: false, message: 'Could not record audit log; membership was restored. Try again.' }
	}

	if (row.profile_id === userId) {
		const { data: remaining } = await supabase
			.from('customer_account_members')
			.select('account_id')
			.eq('profile_id', userId)
			.not('accepted_at', 'is', null)
		const cookieStore = await cookies()
		const first = remaining?.[0]?.account_id as string | undefined
		if (first) {
			cookieStore.set(ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE, first, getActiveAccountCookieOptions())
		} else {
			cookieStore.set(ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE, '', { ...getActiveAccountCookieOptions(), maxAge: 0 })
		}
	}

	revalidatePath('/account/members')
	revalidatePath('/account', 'layout')
	return { ok: true, message: null }
}
