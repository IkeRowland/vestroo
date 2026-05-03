import type { OpsBankAccountDetails } from '@/lib/email/ops-bank-account-settings'

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

/**
 * Epic 16 / **16.16** — HTML fragment appended to **`invoice_due_reminder`** matrix emails for
 * account clients. Inline styles only; appended **before** compliance footer assembly.
 *
 * Uses **full** `account_number` from service-role **`ops_settings`** — not **`getBankAccountForReader`**.
 */
export function renderAccountInvoiceEftAppendHtml(input: {
	bankAccount: OpsBankAccountDetails
	paymentReference: string
	amountZarLabel: string
}): string {
	const { bankAccount: b, paymentReference: ref, amountZarLabel } = input
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:16px 0 0;background:#f8f8f6;border:1px solid #e5e5e5;border-radius:6px">
<tr><td style="padding:14px 16px 4px"><strong style="font-size:15px">Pay by EFT</strong><div style="font-size:13px;color:#555;margin-top:4px">Use the payment reference below so we can match your transfer to this invoice.</div></td></tr>
<tr><td style="padding:6px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
<tr><td style="padding:4px 0;color:#555;width:160px">Bank</td><td style="padding:4px 0">${escapeHtml(b.bank_name)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Account holder</td><td style="padding:4px 0">${escapeHtml(b.account_holder)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Account number</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace"><strong>${escapeHtml(b.account_number)}</strong></td></tr>
<tr><td style="padding:4px 0;color:#555">Branch / sort code</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace">${escapeHtml(b.branch_code)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Payment reference</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace"><strong>${escapeHtml(ref)}</strong></td></tr>
<tr><td style="padding:4px 0;color:#555">Amount</td><td style="padding:4px 0"><strong>${escapeHtml(amountZarLabel)}</strong></td></tr>
</table></td></tr>
<tr><td style="padding:8px 16px 14px;font-size:12px;color:#666">Please use the payment reference exactly as shown.</td></tr>
</table>`
}
