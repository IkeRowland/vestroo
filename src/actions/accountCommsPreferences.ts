'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'

import {
	ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE,
	loadEligibleMemberships,
	resolveActiveAccountForPortal,
} from '@/lib/account-portal-auth'
import { OPS_AUDIT_ACTION_ACCOUNT_COMMS_PREFERENCES_UPDATED } from '@/lib/account-portal-audit-actions'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { createUserServerClient } from '@/lib/supabase/server'
import {
	normalizeCommsPreferencesFromDb,
	toCommsPreferencesJsonb,
	type CommsPreferencesState,
} from '@/types/comms-preferences'

const updatePrefsSchema = z.object({
	informational: z.boolean(),
	marketing: z.boolean(),
})

const rpcOkSchema = z.object({
	ok: z.literal(true),
	member_email: z.string(),
	before: z.unknown(),
	after: z.unknown(),
})

const rpcErrSchema = z.object({
	ok: z.literal(false),
	reason: z.string(),
})

async function requirePortalMemberForPrefs(): Promise<
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
	const has = memberships.some((m) => m.accountId === activeAccountId)
	if (!has) {
		return { ok: false }
	}
	return { ok: true, supabase, userId: user.id, activeAccountId }
}

export type AccountCommsPreferencesLoad = {
	ok: true
	preferences: CommsPreferencesState
	memberEmail: string
} | { ok: false; message: string }

export async function loadAccountCommsPreferencesAction(): Promise<AccountCommsPreferencesLoad> {
	const gate = await requirePortalMemberForPrefs()
	if (!gate.ok) {
		return { ok: false, message: 'Not signed in or no account access.' }
	}
	const { supabase, userId, activeAccountId } = gate

	const { data, error } = await supabase
		.from('customer_account_members')
		.select('comms_preferences, email')
		.eq('account_id', activeAccountId)
		.eq('profile_id', userId)
		.maybeSingle()

	if (error || !data) {
		return { ok: false, message: 'Could not load your preferences for this account.' }
	}

	const preferences = normalizeCommsPreferencesFromDb(data.comms_preferences)
	return {
		ok: true,
		preferences,
		memberEmail: data.email as string,
	}
}

export type AccountCommsPreferencesUpdateResult =
	| { ok: true }
	| { ok: false; message: string }

export async function updateAccountCommsPreferencesAction(
	raw: unknown,
): Promise<AccountCommsPreferencesUpdateResult> {
	const parsed = updatePrefsSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false, message: 'Invalid preferences payload.' }
	}

	const gate = await requirePortalMemberForPrefs()
	if (!gate.ok) {
		return { ok: false, message: 'Not signed in or no account access.' }
	}
	const { supabase, userId, activeAccountId } = gate

	const nextState: CommsPreferencesState = {
		informational: parsed.data.informational,
		marketing: parsed.data.marketing,
		transactional: true,
	}
	const prefsJson = toCommsPreferencesJsonb(nextState)

	const { data: rpcData, error: rpcErr } = await supabase.rpc('set_member_comms_preferences', {
		p_account_id: activeAccountId,
		p_prefs: prefsJson,
	})

	if (rpcErr) {
		return { ok: false, message: rpcErr.message }
	}

	const okParsed = rpcOkSchema.safeParse(rpcData)
	if (okParsed.success) {
		const audit = await appendOpsAuditLog(supabase, {
			actorId: userId,
			actorRole: 'account_portal',
			action: OPS_AUDIT_ACTION_ACCOUNT_COMMS_PREFERENCES_UPDATED,
			entity: 'customer_account_members',
			entityId: activeAccountId,
			payload: {
				account_id: activeAccountId,
				member_email: okParsed.data.member_email,
				before: okParsed.data.before,
				after: okParsed.data.after,
			},
		})
		if (!audit.ok) {
			console.error('[vestroo:account] appendOpsAuditLog preferences failed:', audit.message)
		}
		revalidatePath('/account/preferences')
		revalidatePath('/account')
		return { ok: true }
	}

	const errParsed = rpcErrSchema.safeParse(rpcData)
	if (errParsed.success) {
		const r = errParsed.data.reason
		if (r === 'transactional_locked') {
			return {
				ok: false,
				message: 'Transactional email cannot be turned off.',
			}
		}
		if (r === 'not_found') {
			return { ok: false, message: 'Membership not found for this account.' }
		}
		return { ok: false, message: 'Could not save preferences. Try again.' }
	}

	return { ok: false, message: 'Unexpected response from server.' }
}
