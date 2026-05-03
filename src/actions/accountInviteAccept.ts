'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import type { FinalizeInviteState } from '@/actions/accountInviteAcceptShared'
import { verifyAccountInviteToken } from '@/lib/account-invite-tokens'
import { createUserServerClient } from '@/lib/supabase/server'

const tokenSchema = z.string().trim().min(10).max(8192)

function mapRpcToUserMessage(reason: string | undefined): string {
	switch (reason) {
		case 'email_mismatch':
			return 'You are signed in with a different email than this invitation. Sign out and sign in with the invited address, or ask an admin to send a new invite.'
		case 'invalid_or_expired':
			return 'This invitation link is invalid or has expired. Ask an organisation admin for a new invite.'
		case 'not_authenticated':
			return 'Sign in or create an account first, then try again.'
		case 'email_missing':
			return 'Your account has no email on file. Contact support.'
		default:
			return 'We could not complete this invitation. Ask an organisation admin for a new invite.'
	}
}

export async function finalizeAccountInviteAction(
	_prev: FinalizeInviteState,
	formData: FormData,
): Promise<FinalizeInviteState> {
	const parsed = tokenSchema.safeParse(formData.get('token') ?? '')
	if (!parsed.success) {
		return { ok: false, message: 'Missing or invalid invitation.' }
	}

	const verified = verifyAccountInviteToken(parsed.data)
	if (!verified.valid) {
		return {
			ok: false,
			message:
				verified.reason === 'expired'
					? 'This invitation has expired. Ask an organisation admin for a new invite.'
					: 'This invitation link is invalid. Ask an organisation admin for a new invite.',
		}
	}

	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user) {
		return { ok: false, message: mapRpcToUserMessage('not_authenticated') }
	}

	const { data: rpcData, error: rpcErr } = await supabase.rpc('accept_customer_account_invite', {
		p_account_id: verified.payload.accountId,
		p_email: verified.payload.email,
		p_jti: verified.payload.jti,
	})

	if (rpcErr) {
		return { ok: false, message: 'Could not complete invitation. Try again or contact support.' }
	}

	let body: Record<string, unknown> | null = null
	if (rpcData != null && typeof rpcData === 'object' && !Array.isArray(rpcData)) {
		body = rpcData as Record<string, unknown>
	} else if (typeof rpcData === 'string') {
		try {
			const parsed = JSON.parse(rpcData) as unknown
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				body = parsed as Record<string, unknown>
			}
		} catch {
			body = null
		}
	}

	if (!body || typeof body.ok !== 'boolean') {
		return { ok: false, message: 'Could not complete invitation. Try again or contact support.' }
	}

	if (!body.ok) {
		return { ok: false, message: mapRpcToUserMessage(typeof body.reason === 'string' ? body.reason : undefined) }
	}

	revalidatePath('/account', 'layout')
	revalidatePath('/account/members')
	return {
		ok: true,
		message:
			body.already === true
				? 'You are already a member of this organisation. You can open the account portal.'
				: 'Welcome — your invitation was accepted. You can open the account portal.',
	}
}
