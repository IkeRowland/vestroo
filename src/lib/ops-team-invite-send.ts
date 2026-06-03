import type { SupabaseClient } from '@supabase/supabase-js'

import { getRoleDisplayLabel } from '@/features/ops/role-display'
import { appendComplianceFooterToEmailHtml } from '@/lib/email/compliance-footer-html'
import { resolveSupportContactLine } from '@/lib/email/email-copy'
import {
	buildOpsTeamMemberInviteEmailSubject,
	renderOpsTeamMemberInviteHtml,
} from '@/lib/email/templates/ops-team-member-invite'
import { sendEmail } from '@/lib/email/send'
import type { ProfileRole } from '@/types/database.types'

export type OpsTeamInviteSendResult =
	| { ok: true; mode: 'sent' | 'skipped_test_mode' }
	| { ok: false; message: string }

function logOpsTeamInviteEmailFailure(context: Record<string, unknown>): void {
	console.error('[vestroo:ops-team-invite] email_send_failed', context)
}

async function resolveInviterDisplayName(
	supabase: SupabaseClient,
	inviterUserId: string,
): Promise<string> {
	const { data: profile } = await supabase
		.from('profiles')
		.select('full_name')
		.eq('id', inviterUserId)
		.maybeSingle()

	if (profile?.full_name && String(profile.full_name).trim().length > 0) {
		return String(profile.full_name).trim()
	}
	return 'A platform admin'
}

/** Default Supabase invite/recovery link window when API does not return an expiry. */
export function opsTeamInviteExpiryDisplayLabel(): string {
	return 'within 24 hours'
}

/**
 * Sends the Vestroo-branded ops team invite email (Resend). Does not call Supabase Auth mailers.
 */
export async function sendOpsTeamMemberInviteEmail(opts: {
	supabase: SupabaseClient
	to: string
	role: ProfileRole
	inviterUserId: string
	acceptInviteAbsoluteUrl: string
	/** Used for Resend idempotency (per invitee + inviter wave). */
	idempotencyUserId: string
}): Promise<OpsTeamInviteSendResult> {
	const emailLower = opts.to.trim().toLowerCase()
	const inviterName = await resolveInviterDisplayName(opts.supabase, opts.inviterUserId)
	const roleLabel = getRoleDisplayLabel(opts.role)

	const html = renderOpsTeamMemberInviteHtml({
		inviterDisplayName: inviterName,
		invitedRoleLabel: roleLabel,
		acceptInviteAbsoluteUrl: opts.acceptInviteAbsoluteUrl,
		expiryDisplayLabel: opsTeamInviteExpiryDisplayLabel(),
		supportContactLine: resolveSupportContactLine(),
	})

	const htmlWithFooter = appendComplianceFooterToEmailHtml(html, {
		category: 'transactional',
		portalPreferenceLinks: false,
		prefsLinkCategory: null,
		buildAccountPreferencesUrl: () => '',
	})

	const subject = buildOpsTeamMemberInviteEmailSubject()
	const idempotencyKey = `ops_team_invite:${emailLower}:${opts.idempotencyUserId}`

	const sent = await sendEmail({
		to: opts.to.trim(),
		subject,
		html: htmlWithFooter,
		idempotencyKey,
	})

	if (!sent.ok) {
		logOpsTeamInviteEmailFailure({
			target_email: emailLower,
			inviter_user_id: opts.inviterUserId,
			kind: sent.error.kind,
			message: sent.error.message,
		})
		return { ok: false, message: `Email could not be sent: ${sent.error.message}` }
	}

	return { ok: true, mode: sent.mode }
}
