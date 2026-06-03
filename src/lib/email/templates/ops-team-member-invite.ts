import { resolveSupportContactLine } from '@/lib/email/email-copy'

export const opsTeamMemberInviteTemplateId = 'ops-team-member-invite' as const

export type OpsTeamMemberInviteTemplateId = typeof opsTeamMemberInviteTemplateId

export type OpsTeamMemberInviteEmailProps = {
	inviterDisplayName: string
	invitedRoleLabel: string
	acceptInviteAbsoluteUrl: string
	expiryDisplayLabel: string
	supportContactLine: string
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

export function buildOpsTeamMemberInviteEmailSubject(): string {
	return 'Vestroo — invitation to join the operations team'
}

/**
 * Transactional invite for ops staff (admin / dispatcher).
 */
export function renderOpsTeamMemberInviteHtml(props: OpsTeamMemberInviteEmailProps): string {
	const cta = escapeHtml(props.acceptInviteAbsoluteUrl)
	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;border:1px solid #e5e5e5">
<tr><td style="padding:24px 28px">
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Hello,</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">
<strong>${escapeHtml(props.inviterDisplayName)}</strong> has invited you to join the
<strong>Vestroo</strong> operations team as <strong>${escapeHtml(props.invitedRoleLabel)}</strong>.
</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#444">
Use the secure link below to accept the invitation and set your password. You can then sign in to the
operations console with this email address. This link expires
<strong>${escapeHtml(props.expiryDisplayLabel)}</strong>.
</p>
<p style="margin:0 0 24px;text-align:center">
<a href="${cta}" style="display:inline-block;padding:12px 22px;background:#25A89B;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px">Accept invitation</a>
</p>
<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#555">
If the button does not work, copy and paste this URL into your browser:<br/>
<span style="word-break:break-all">${cta}</span>
</p>
<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#444">${escapeHtml(props.supportContactLine)}</p>
<p style="margin:0;font-size:12px;color:#777">— Vestroo Driver Services</p>
</td></tr></table>
</td></tr></table>
</body></html>`
}

/** @deprecated Registry smoke — prefer `renderOpsTeamMemberInviteHtml` with real props. */
export function getOpsTeamMemberInviteStubHtml(): string {
	return renderOpsTeamMemberInviteHtml({
		inviterDisplayName: 'A platform admin',
		invitedRoleLabel: 'Dispatcher',
		acceptInviteAbsoluteUrl: 'https://example.com/ops/login',
		expiryDisplayLabel: 'within 24 hours',
		supportContactLine: resolveSupportContactLine(),
	})
}
