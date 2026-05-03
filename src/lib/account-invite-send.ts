import type { SupabaseClient } from '@supabase/supabase-js'



import { portalRoleLabel } from '@/lib/account-portal-auth'

import {

	accountInviteExpiryMs,

	mintAccountInviteJti,

	signAccountInviteToken,

	type AccountInviteTokenPayload,

} from '@/lib/account-invite-tokens'

import { buildAccountPreferencesAbsoluteUrl } from '@/lib/email/account-preferences-url'

import { appendComplianceFooterToEmailHtml } from '@/lib/email/compliance-footer-html'

import { resolveSupportContactLine } from '@/lib/email/email-copy'

import {

	buildAccountMemberInviteEmailSubject,

	renderAccountMemberInviteHtml,

} from '@/lib/email/templates/account-member-invite'

import { sendEmail } from '@/lib/email/send'

import { absoluteUrl } from '@/lib/site-url'

import type { CustomerAccountMemberRoleDb } from '@/types/database.types'



const RESEND_COOLDOWN_MS = 45_000



export type InviteSendResult =

	| { ok: true; mode: 'sent' | 'skipped_test_mode' }

	| { ok: false; message: string; cooldownRemainingMs?: number }



export type MintPendingAccountInviteResult =

	| {

			ok: true

			acceptUrl: string

			jti: string

			expMs: number

			inviterName: string

			roleLabel: string

	  }

	| { ok: false; message: string }



function formatExpiryLabel(expMs: number): string {

	try {

		const d = new Date(expMs)

		return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(d)

	} catch {

		return 'on the date shown in your invite'

	}

}



function logInviteEmailFailure(context: Record<string, unknown>): void {

	console.error('[vestroo:account-invite] email_send_failed', context)

}



/**

 * Writes **`invite_token_jti` / `invite_expires_at`** on the pending row and builds the signed accept URL.

 * Does **not** send email — use **`rotateInviteTokenAndSendEmail`** for outbound mail.

 */

export async function mintPendingAccountInviteAcceptUrl(opts: {

	supabase: SupabaseClient

	accountId: string

	memberEmailDb: string

	memberRole: CustomerAccountMemberRoleDb

	accountName: string

	inviterUserId: string

}): Promise<MintPendingAccountInviteResult> {

	const emailLower = opts.memberEmailDb.toLowerCase()



	const jti = mintAccountInviteJti()

	const expMs = accountInviteExpiryMs(7)

	const inviteExpiresAt = new Date(expMs).toISOString()



	const { error: updErr } = await opts.supabase

		.from('customer_account_members')

		.update({

			invite_token_jti: jti,

			invite_expires_at: inviteExpiresAt,

		})

		.eq('account_id', opts.accountId)

		.eq('email', opts.memberEmailDb)

		.is('accepted_at', null)



	if (updErr) {

		return { ok: false, message: updErr.message }

	}



	const { data: profile } = await opts.supabase

		.from('profiles')

		.select('full_name')

		.eq('id', opts.inviterUserId)

		.maybeSingle()



	const inviterName =

		profile?.full_name && String(profile.full_name).trim().length > 0

			? String(profile.full_name).trim()

			: 'An organisation admin'



	const roleLabel = portalRoleLabel(opts.memberRole)



	const payload: AccountInviteTokenPayload = {

		accountId: opts.accountId,

		email: emailLower,

		jti,

		accountName: opts.accountName.trim() || 'Your organisation',

		roleLabel,

		exp: expMs,

	}



	let token: string

	try {

		token = signAccountInviteToken(payload)

	} catch (e) {

		logInviteEmailFailure({

			account_id: opts.accountId,

			target_email: emailLower,

			stage: 'sign_token',

			message: e instanceof Error ? e.message : String(e),

		})

		return {

			ok: false,

			message:

				'Invite is saved but email could not be prepared (signing key missing). Configure VESTROO_ACCOUNT_INVITE_SIGNING_KEY or QUOTE_LINK_SIGNING_KEY.',

		}

	}



	const acceptUrl = `${absoluteUrl('/account/signup')}?token=${encodeURIComponent(token)}`

	return { ok: true, acceptUrl, jti, expMs, inviterName, roleLabel }

}



/**

 * Rotates invite token metadata on the row and sends (or skips in Resend test mode) the invite email.

 * On Resend failure the pending row + new jti remain; admin can use **Resend** after cooldown.

 */

export async function rotateInviteTokenAndSendEmail(opts: {

	supabase: SupabaseClient

	accountId: string

	memberEmailDb: string

	memberRole: CustomerAccountMemberRoleDb

	accountName: string

	inviterUserId: string

	/** When set, refuse send if last send within cooldown (resend UX). */

	enforceCooldown: boolean

	lastSentAtIso: string | null

}): Promise<InviteSendResult> {

	const emailLower = opts.memberEmailDb.toLowerCase()



	if (opts.enforceCooldown && opts.lastSentAtIso) {

		const last = new Date(opts.lastSentAtIso).getTime()

		if (!Number.isNaN(last)) {

			const elapsed = Date.now() - last

			if (elapsed >= 0 && elapsed < RESEND_COOLDOWN_MS) {

				return {

					ok: false,

					message: `Please wait a few seconds before resending (${Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)}s).`,

					cooldownRemainingMs: RESEND_COOLDOWN_MS - elapsed,

				}

			}

		}

	}



	const minted = await mintPendingAccountInviteAcceptUrl({

		supabase: opts.supabase,

		accountId: opts.accountId,

		memberEmailDb: opts.memberEmailDb,

		memberRole: opts.memberRole,

		accountName: opts.accountName,

		inviterUserId: opts.inviterUserId,

	})



	if (!minted.ok) {

		return { ok: false, message: minted.message }

	}



	const { acceptUrl, jti, expMs, inviterName, roleLabel } = minted



	const html = renderAccountMemberInviteHtml({

		organisationName: opts.accountName.trim() || 'Your organisation',

		inviterDisplayName: inviterName,

		invitedRoleLabel: roleLabel,

		acceptInviteAbsoluteUrl: acceptUrl,

		expiryDisplayLabel: formatExpiryLabel(expMs),

		supportContactLine: resolveSupportContactLine(),

	})

	/** **15C.6** — `member_invited` is **transactional**; no **preference** URL (pending invite, **AC6**). */

	const htmlWithFooter = appendComplianceFooterToEmailHtml(html, {

		category: 'transactional',

		portalPreferenceLinks: false,

		prefsLinkCategory: null,

		buildAccountPreferencesUrl: buildAccountPreferencesAbsoluteUrl,

	})



	const subject = buildAccountMemberInviteEmailSubject(opts.accountName.trim() || 'your organisation')

	const idempotencyKey = `account_member_invite:${opts.accountId}:${emailLower}:${jti}`



	const sent = await sendEmail({

		to: opts.memberEmailDb,

		subject,

		html: htmlWithFooter,

		idempotencyKey,

	})



	if (!sent.ok) {

		logInviteEmailFailure({

			account_id: opts.accountId,

			target_email: emailLower,

			stage: 'resend_api',

			kind: sent.error.kind,

			message: sent.error.message,

		})

		return { ok: false, message: `Email could not be sent: ${sent.error.message}` }

	}



	const sentAt = new Date().toISOString()

	const { error: stampErr } = await opts.supabase

		.from('customer_account_members')

		.update({ invite_email_last_sent_at: sentAt })

		.eq('account_id', opts.accountId)

		.eq('email', opts.memberEmailDb)

		.eq('invite_token_jti', jti)



	if (stampErr) {

		logInviteEmailFailure({

			account_id: opts.accountId,

			target_email: emailLower,

			stage: 'stamp_last_sent',

			message: stampErr.message,

		})

	}



	return { ok: true, mode: sent.mode }

}


