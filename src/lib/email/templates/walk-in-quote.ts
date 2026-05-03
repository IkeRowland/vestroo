import { resolveSupportContactLine } from '@/lib/email/email-copy'
import type { WalkInQuoteBankAccountDetails } from '@/lib/email/walk-in-quote-bank-context'
import type { BookingQuoteLineItem } from '@/types/booking-quote'

export const walkInQuoteTemplateId = 'walk-in-quote' as const

export type WalkInQuoteEmailProps = {
	customerName: string
	bookingReference: string
	pickupDateTimeLabel: string
	originLabel: string
	destinationLabel: string
	vehicleCategoryLabel: string | null
	passengerCount: number | null
	totalZarLabel: string
	lineItems: BookingQuoteLineItem[]
	/** Human-friendly expiry in customer timezone (e.g. SAST). */
	expiryFriendly: string
	acceptUrl: string
	rejectUrl: string
	/**
	 * Epic 16 / Story **16.15** (Theme N / US-N4) — bank account JSON sourced from
	 * `ops_settings.bank_account` (full unmasked for customer email; assembled server-side
	 * only — see `walk-in-quote-bank-context.ts`).
	 */
	bankAccount: WalkInQuoteBankAccountDetails
	/**
	 * Substituted from `ops_settings.bank_account.reference_format` with the booking
	 * reference (default `VST-{booking_ref}`). Customer must use this string as the EFT
	 * reference so finance can reconcile the deposit to the booking.
	 */
	paymentReference: string
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

function ctaButton(href: string, label: string, primary: boolean): string {
	const bg = primary ? '#111' : '#fff'
	const fg = primary ? '#fff' : '#111'
	const border = primary ? 'none' : '1px solid #ccc'
	return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:6px 8px 6px 0;padding:12px 20px;border-radius:6px;background:${bg};color:${fg};border:${border};text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(label)}</a>`
}

function bankDetailsHtml(bank: WalkInQuoteBankAccountDetails, reference: string, total: string): string {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:0 0 20px;background:#f8f8f6;border:1px solid #e5e5e5;border-radius:6px">
<tr><td style="padding:14px 16px 4px"><strong style="font-size:15px">Pay by EFT</strong><div style="font-size:13px;color:#555;margin-top:4px">Use the reference below so we can match your payment to this booking. Once we receive payment, your driver will be confirmed.</div></td></tr>
<tr><td style="padding:6px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
<tr><td style="padding:4px 0;color:#555;width:160px">Bank</td><td style="padding:4px 0">${escapeHtml(bank.bank_name)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Account holder</td><td style="padding:4px 0">${escapeHtml(bank.account_holder)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Account number</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace"><strong>${escapeHtml(bank.account_number)}</strong></td></tr>
<tr><td style="padding:4px 0;color:#555">Branch / sort code</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace">${escapeHtml(bank.branch_code)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Reference</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace"><strong>${escapeHtml(reference)}</strong></td></tr>
<tr><td style="padding:4px 0;color:#555">Amount</td><td style="padding:4px 0"><strong>${escapeHtml(total)}</strong></td></tr>
</table></td></tr>
<tr><td style="padding:8px 16px 14px;font-size:12px;color:#666">Please use the reference exactly as shown — it links your EFT to this booking.</td></tr>
</table>`
}

/**
 * Epic 14 / Story **14.6** — walk-in quote email (**US-D2**); URLs are opaque path segments only (no PII query params).
 *
 * Epic 16 / Story **16.15** (Theme N / US-N4) — extended to include EFT bank details + payment reference
 * sourced from `ops_settings.bank_account` (server-side merge in `sendWalkInQuote`). Historical
 * hosted-checkout links were removed per N2 / Q31; the only customer-side action surfaced is **accept** (Q33) plus EFT instructions.
 */
export function renderWalkInQuoteHtml(props: WalkInQuoteEmailProps): string {
	const tableBody = lineItemRowsHtml(props.lineItems)
	const vehicle =
		props.vehicleCategoryLabel && props.vehicleCategoryLabel.trim() !== ''
			? escapeHtml(props.vehicleCategoryLabel.trim())
			: '—'
	const pax =
		props.passengerCount != null && props.passengerCount > 0 ? String(props.passengerCount) : '—'

	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;border:1px solid #e5e5e5">
<tr><td style="padding:24px 28px">
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Hi ${escapeHtml(props.customerName)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">
Here is your <strong>Vestroo quote</strong>. To confirm, accept the quote below and pay by EFT using the bank details and reference provided.
</p>
<h1 style="margin:0 0 12px;font-size:18px;line-height:1.3">Your quote</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:16px">
<tr><td style="padding:4px 0;color:#555;width:160px">Booking reference</td><td style="padding:4px 0"><strong>${escapeHtml(props.bookingReference)}</strong></td></tr>
<tr><td style="padding:4px 0;color:#555">Pickup</td><td style="padding:4px 0">${escapeHtml(props.pickupDateTimeLabel)}</td></tr>
<tr><td style="padding:4px 0;color:#555;vertical-align:top">Route</td><td style="padding:4px 0">${escapeHtml(props.originLabel)} → ${escapeHtml(props.destinationLabel)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Vehicle class</td><td style="padding:4px 0">${vehicle}</td></tr>
<tr><td style="padding:4px 0;color:#555">Passengers</td><td style="padding:4px 0">${pax}</td></tr>
<tr><td style="padding:4px 0;color:#555">Total</td><td style="padding:4px 0"><strong>${escapeHtml(props.totalZarLabel)}</strong></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:20px">
<thead><tr>
<th align="left" style="padding:8px;border-bottom:2px solid #ddd">Item</th>
<th align="right" style="padding:8px;border-bottom:2px solid #ddd">Qty</th>
<th align="right" style="padding:8px;border-bottom:2px solid #ddd">Unit</th>
<th align="right" style="padding:8px;border-bottom:2px solid #ddd">Line total</th>
</tr></thead>
<tbody>${tableBody}</tbody>
</table>
<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#444">
<strong>Quote validity:</strong> ${escapeHtml(props.expiryFriendly)}. After that time you will need a fresh quote — prices and availability may change.
</p>
${bankDetailsHtml(props.bankAccount, props.paymentReference, props.totalZarLabel)}
<div style="margin:20px 0 8px">
${ctaButton(props.acceptUrl, 'Accept quote', true)}
${ctaButton(props.rejectUrl, "This isn't right for me", false)}
</div>
<p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#444">
Tap <strong>Accept quote</strong> to confirm, then make the EFT using the bank details above. Your driver is allocated as soon as we receive payment.
</p>
<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#444">${escapeHtml(props.supportContactLine)}</p>
<p style="margin:20px 0 0;font-size:12px;color:#777">— Vestroo Driver Services</p>
</td></tr></table>
</td></tr></table>
</body></html>`
}

/**
 * Epic 16 / Story **16.15** (Theme N / US-N4) — plaintext counterpart for the walk-in quote
 * email. Same facts as the HTML render: quote summary + EFT bank details + reference + accept URL.
 *
 * **Pipeline note:** as of 16.15, `sendEmail` (`src/lib/email/send.ts`) and the
 * `ops_send_booking_quote_v1` RPC store/transmit only `html`. This helper is exported and unit-tested
 * so a future pipeline extension can plumb `text` through without re-deriving the copy. See Progress
 * Notes on **`docs/stories/16.15.story.md`** for the tracked follow-up.
 */
export function buildWalkInQuotePlaintext(props: WalkInQuoteEmailProps): string {
	const lines: string[] = []
	lines.push(`Hi ${props.customerName},`)
	lines.push('')
	lines.push(
		'Here is your Vestroo quote. To confirm, accept the quote below and pay by EFT using the bank details and reference provided.',
	)
	lines.push('')
	lines.push('YOUR QUOTE')
	lines.push(`Booking reference: ${props.bookingReference}`)
	lines.push(`Pickup: ${props.pickupDateTimeLabel}`)
	lines.push(`Route: ${props.originLabel} -> ${props.destinationLabel}`)
	if (props.vehicleCategoryLabel && props.vehicleCategoryLabel.trim() !== '') {
		lines.push(`Vehicle class: ${props.vehicleCategoryLabel.trim()}`)
	}
	if (props.passengerCount != null && props.passengerCount > 0) {
		lines.push(`Passengers: ${props.passengerCount}`)
	}
	lines.push(`Total: ${props.totalZarLabel}`)
	lines.push('')
	if (props.lineItems.length > 0) {
		lines.push('LINE ITEMS')
		for (const row of props.lineItems) {
			lines.push(
				`- ${row.label} (qty ${row.qty} @ ${formatZarLine(row.unit_zar)}) = ${formatZarLine(row.total_zar)}`,
			)
			if (row.note && row.note.trim() !== '') {
				lines.push(`  ${row.note.trim()}`)
			}
		}
		lines.push('')
	}
	lines.push(`Quote validity: ${props.expiryFriendly}.`)
	lines.push('After that time you will need a fresh quote — prices and availability may change.')
	lines.push('')
	lines.push('PAY BY EFT')
	lines.push(
		'Use the reference below so we can match your payment to this booking. Once we receive payment, your driver will be confirmed.',
	)
	lines.push(`Bank: ${props.bankAccount.bank_name}`)
	lines.push(`Account holder: ${props.bankAccount.account_holder}`)
	lines.push(`Account number: ${props.bankAccount.account_number}`)
	lines.push(`Branch / sort code: ${props.bankAccount.branch_code}`)
	lines.push(`Reference: ${props.paymentReference}`)
	lines.push(`Amount: ${props.totalZarLabel}`)
	lines.push('Please use the reference exactly as shown — it links your EFT to this booking.')
	lines.push('')
	lines.push(`Accept quote: ${props.acceptUrl}`)
	lines.push(`This isn't right for me: ${props.rejectUrl}`)
	lines.push('')
	lines.push(props.supportContactLine)
	lines.push('— Vestroo Driver Services')
	return lines.join('\n')
}

export function buildWalkInQuoteEmailSubject(bookingReference: string, expiresAtIso: string): string {
	const d = new Date(expiresAtIso)
	const validUntil = Number.isNaN(d.getTime())
		? '—'
		: new Intl.DateTimeFormat('en-ZA', {
				timeZone: 'Africa/Johannesburg',
				dateStyle: 'medium',
				timeStyle: 'short',
			}).format(d)
	return `Your Vestroo quote — ${bookingReference} — valid until ${validUntil}`
}

/** @internal Registry smoke — prefer {@link renderWalkInQuoteHtml} with real props. */
export function getWalkInQuoteStubHtml(): string {
	return renderWalkInQuoteHtml({
		customerName: 'Customer',
		bookingReference: '—',
		pickupDateTimeLabel: '—',
		originLabel: '—',
		destinationLabel: '—',
		vehicleCategoryLabel: null,
		passengerCount: 1,
		totalZarLabel: 'R 0,00',
		lineItems: [],
		expiryFriendly: '—',
		acceptUrl: 'https://example.com/q/token/accept',
		rejectUrl: 'https://example.com/q/token/reject',
		bankAccount: {
			bank_name: '—',
			account_holder: '—',
			account_number: '—',
			branch_code: '—',
		},
		paymentReference: '—',
		supportContactLine: resolveSupportContactLine(),
	})
}
