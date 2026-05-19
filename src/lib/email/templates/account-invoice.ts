import {
	ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET,
	resolveSupportContactLine,
} from '@/lib/email/email-copy'
import type { BookingQuoteLineItem } from '@/types/booking-quote'

export type AccountInvoiceHtmlProps = {
	customerName: string
	invoiceNumber: string
	issueDateLabel: string
	dueDateLabel: string
	creditTermsDays: number
	lineItems: BookingQuoteLineItem[]
	totalZarLabel: string
	supportContactLine: string
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function formatZarLine(amount: number): string {
	return new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency: 'ZAR',
	}).format(amount)
}

function lineItemRowsHtml(items: BookingQuoteLineItem[]): string {
	if (!items.length) {
		return '<tr><td colspan="4" style="padding:8px">No line items.</td></tr>'
	}
	return items
		.map((row) => {
			const note =
				row.note && row.note.trim() !== ''
					? `<div style="font-size:12px;color:#555;margin-top:2px">${escapeHtml(row.note)}</div>`
					: ''
			return `<tr>
<td style="padding:8px;border-bottom:1px solid #eee;vertical-align:top">${escapeHtml(row.label)}${note}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(String(row.qty))}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(formatZarLine(row.unit_zar))}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${escapeHtml(formatZarLine(row.total_zar))}</td>
</tr>`
		})
		.join('')
}

/**
 * Standard account invoice HTML (line-item table matches trip confirmation / quote emails).
 */
export function renderAccountInvoiceHtml(props: AccountInvoiceHtmlProps): string {
	const tableBody = lineItemRowsHtml(props.lineItems)
	const paymentTerms = `Payment due within ${props.creditTermsDays} days of invoice date.`

	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;border:1px solid #e5e5e5">
<tr><td style="padding:24px 28px">
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Dear ${escapeHtml(props.customerName)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">
Please find your <strong>tax invoice</strong> below. Pay by EFT using the payment reference in the separate bank-details section of this email.
</p>
<h1 style="margin:0 0 12px;font-size:18px;line-height:1.3">Invoice ${escapeHtml(props.invoiceNumber)}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:20px">
<tr><td style="padding:4px 0;color:#555;width:160px">Issue date</td><td style="padding:4px 0">${escapeHtml(props.issueDateLabel)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Due date</td><td style="padding:4px 0">${escapeHtml(props.dueDateLabel)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Total due</td><td style="padding:4px 0"><strong>${escapeHtml(props.totalZarLabel)}</strong></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:20px">
<thead><tr>
<th align="left" style="padding:8px;border-bottom:2px solid #ddd">Description</th>
<th align="right" style="padding:8px;border-bottom:2px solid #ddd">Qty</th>
<th align="right" style="padding:8px;border-bottom:2px solid #ddd">Unit</th>
<th align="right" style="padding:8px;border-bottom:2px solid #ddd">Line total</th>
</tr></thead>
<tbody>${tableBody}</tbody>
</table>
<p style="margin:0 0 12px;font-size:14px;line-height:1.5"><strong>Payment terms:</strong> ${escapeHtml(paymentTerms)}</p>
<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#444"><strong>Cancellation:</strong> ${escapeHtml(ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET)}</p>
<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#444">${escapeHtml(props.supportContactLine)}</p>
<p style="margin:0;font-size:12px;color:#777">— Vestroo Driver Services</p>
</td></tr></table>
</td></tr></table>
</body></html>`
}

export function defaultAccountInvoiceSupportLine(): string {
	return resolveSupportContactLine()
}
