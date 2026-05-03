import { resolveSupportContactLine } from '@/lib/email/email-copy'
import type { WalkInQuoteBankAccountDetails } from '@/lib/email/walk-in-quote-bank-context'

export const walkInAcceptanceConfirmationTemplateId = 'walk-in-acceptance-confirmation' as const

export type WalkInAcceptanceConfirmationEmailProps = {
	customerName: string
	bookingReference: string
	paymentReference: string
	bankAccount: WalkInQuoteBankAccountDetails
	supportContactLine: string
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function bankDetailsHtml(bank: WalkInQuoteBankAccountDetails, reference: string): string {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:0 0 20px;background:#f8f8f6;border:1px solid #e5e5e5;border-radius:6px">
<tr><td style="padding:14px 16px 4px"><strong style="font-size:15px">Pay by EFT</strong><div style="font-size:13px;color:#555;margin-top:4px">Use the reference below so we can match your payment to this booking.</div></td></tr>
<tr><td style="padding:6px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
<tr><td style="padding:4px 0;color:#555;width:160px">Bank</td><td style="padding:4px 0">${escapeHtml(bank.bank_name)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Account holder</td><td style="padding:4px 0">${escapeHtml(bank.account_holder)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Account number</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace"><strong>${escapeHtml(bank.account_number)}</strong></td></tr>
<tr><td style="padding:4px 0;color:#555">Branch / sort code</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace">${escapeHtml(bank.branch_code)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Reference</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace"><strong>${escapeHtml(reference)}</strong></td></tr>
</table></td></tr>
<tr><td style="padding:8px 16px 14px;font-size:12px;color:#666">Please use the reference exactly as shown — it links your EFT to this booking.</td></tr>
</table>`
}

/**
 * Epic 16 / Story **16.17** (Theme N / US-N6) — sent once when a walk-in customer first accepts
 * a quote; mirrors bank + reference on `/q/[token]/accept`.
 */
export function renderWalkInAcceptanceConfirmationHtml(props: WalkInAcceptanceConfirmationEmailProps): string {
	const who = props.customerName.trim() !== '' ? props.customerName.trim() : 'there'
	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;border:1px solid #e5e5e5">
<tr><td style="padding:24px 28px">
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Hi ${escapeHtml(who)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Thank you — <strong>your quote is accepted</strong>.</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Your booking reference: <strong>${escapeHtml(props.bookingReference)}</strong></p>
${bankDetailsHtml(props.bankAccount, props.paymentReference)}
<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#333">We'll confirm receipt of your EFT within <strong>1 business day</strong>. This email is your confirmation of acceptance; keep it for your records.</p>
<p style="margin:0 0 0;font-size:14px;line-height:1.5;color:#333">If you have any questions, reply to this email or use the contact details below.</p>
<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#444">${escapeHtml(props.supportContactLine)}</p>
<p style="margin:20px 0 0;font-size:12px;color:#777">— Vestroo Driver Services</p>
</td></tr></table>
</td></tr></table>
</body></html>`
}

/**
 * Plaintext companion — `sendEmail` does not plumb `text` yet; exposed for template tests / future pipeline.
 */
export function buildWalkInAcceptanceConfirmationPlaintext(props: WalkInAcceptanceConfirmationEmailProps): string {
	const who = props.customerName.trim() !== '' ? props.customerName.trim() : 'there'
	const lines: string[] = []
	lines.push(`Hi ${who},`)
	lines.push('')
	lines.push('Thank you — your quote is accepted.')
	lines.push(`Your booking reference: ${props.bookingReference}`)
	lines.push('')
	lines.push('PAY BY EFT')
	lines.push(`Bank: ${props.bankAccount.bank_name}`)
	lines.push(`Account holder: ${props.bankAccount.account_holder}`)
	lines.push(`Account number: ${props.bankAccount.account_number}`)
	lines.push(`Branch / sort code: ${props.bankAccount.branch_code}`)
	lines.push(`Reference: ${props.paymentReference}`)
	lines.push('')
	lines.push(
		"We'll confirm receipt of your EFT within 1 business day. This email is your confirmation of acceptance; keep it for your records.",
	)
	lines.push('')
	lines.push(props.supportContactLine)
	lines.push('— Vestroo Driver Services')
	return lines.join('\n')
}

export function buildWalkInAcceptanceConfirmationSubject(bookingReference: string): string {
	return `Quote accepted — ${bookingReference} — EFT details`
}

/** @internal */
export function getWalkInAcceptanceConfirmationStubHtml(): string {
	return renderWalkInAcceptanceConfirmationHtml({
		customerName: 'Customer',
		bookingReference: 'VST-123',
		paymentReference: 'VST-VST-123',
		bankAccount: {
			bank_name: '—',
			account_holder: '—',
			account_number: '0000000',
			branch_code: '000000',
		},
		supportContactLine: resolveSupportContactLine(),
	})
}
