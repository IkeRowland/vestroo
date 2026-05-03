import {
	ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET,
	resolveSupportContactLine,
} from '@/lib/email/email-copy'
import type { BookingQuoteLineItem } from '@/types/booking-quote'

export const accountTripConfirmationTemplateId = 'account-trip-confirmation' as const

export type AccountTripConfirmationTemplateId = typeof accountTripConfirmationTemplateId

export type AccountTripConfirmationProps = {
	customerName: string
	bookingReference: string
	pickupDateTimeLabel: string
	originLabel: string
	destinationLabel: string
	vehicleName: string
	vehicleCategoryLabel: string
	driverFullName: string
	totalZarLabel: string
	lineItems: BookingQuoteLineItem[]
	creditTermsDays: number
	cancellationSnippet: string
	supportContactLine: string
	/** Epic 15 / 15B.2 — signed `/track/...` URL when mint succeeds; omit section when absent. */
	riderTrackingUrl?: string
	/** When set with `riderTrackingUrl`, copy suggests sharing with this rider email. */
	riderEmailForCopy?: string
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
 * Trip confirmation email with embedded quote breakdown (Epic 13 — one email, Q8).
 */
export function renderAccountTripConfirmationHtml(props: AccountTripConfirmationProps): string {
	const paymentTerms = `Invoice to follow within ${props.creditTermsDays} days.`
	const tableBody = lineItemRowsHtml(props.lineItems)
	const riderSection =
		typeof props.riderTrackingUrl === 'string' && props.riderTrackingUrl.trim() !== ''
			? `<div id="rider-tracking" style="margin:0 0 20px;padding:16px;border-radius:8px;border:1px solid #cfe8e4;background:#f0faf8">
<h2 style="margin:0 0 10px;font-size:16px;line-height:1.3;color:#0f3d36">Rider tracking</h2>
<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#333">
Use the link below to follow this trip in your browser — no portal login is required. The link expires automatically for privacy and security.
</p>
<p style="margin:0 0 12px;font-size:14px;line-height:1.5">
<a href="${escapeHtml(props.riderTrackingUrl.trim())}" style="color:#1a7a70;font-weight:600">Open rider tracking</a>
</p>
${
	props.riderEmailForCopy && props.riderEmailForCopy.trim() !== ''
		? `<p style="margin:0;font-size:13px;line-height:1.5;color:#444">If the traveller is not the same person as you, you can share this link with them directly — we also have <strong>${escapeHtml(props.riderEmailForCopy.trim())}</strong> on file as rider contact.</p>`
		: `<p style="margin:0;font-size:13px;line-height:1.5;color:#444">If someone else is travelling, you can forward this email so they can open the link without a portal account.</p>`
}
</div>`
			: ''

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
Thank you for booking with Vestroo. Below is your <strong>trip confirmation</strong> together with the <strong>quote details</strong> for this booking.
</p>
<h1 style="margin:0 0 12px;font-size:18px;line-height:1.3">Trip confirmation &amp; quote</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:20px">
<tr><td style="padding:4px 0;color:#555;width:160px">Booking reference</td><td style="padding:4px 0"><strong>${escapeHtml(props.bookingReference)}</strong></td></tr>
<tr><td style="padding:4px 0;color:#555">Pickup</td><td style="padding:4px 0">${escapeHtml(props.pickupDateTimeLabel)}</td></tr>
<tr><td style="padding:4px 0;color:#555;vertical-align:top">Route</td><td style="padding:4px 0">${escapeHtml(props.originLabel)} → ${escapeHtml(props.destinationLabel)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Vehicle</td><td style="padding:4px 0">${escapeHtml(props.vehicleName)} <span style="color:#555">(${escapeHtml(props.vehicleCategoryLabel)})</span></td></tr>
<tr><td style="padding:4px 0;color:#555">Driver</td><td style="padding:4px 0">${escapeHtml(props.driverFullName)}</td></tr>
<tr><td style="padding:4px 0;color:#555">Total (quoted)</td><td style="padding:4px 0"><strong>${escapeHtml(props.totalZarLabel)}</strong></td></tr>
</table>
${riderSection}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:20px">
<thead><tr>
<th align="left" style="padding:8px;border-bottom:2px solid #ddd">Item</th>
<th align="right" style="padding:8px;border-bottom:2px solid #ddd">Qty</th>
<th align="right" style="padding:8px;border-bottom:2px solid #ddd">Unit</th>
<th align="right" style="padding:8px;border-bottom:2px solid #ddd">Line total</th>
</tr></thead>
<tbody>${tableBody}</tbody>
</table>
<p style="margin:0 0 12px;font-size:14px;line-height:1.5"><strong>Payment terms:</strong> ${escapeHtml(paymentTerms)}</p>
<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#444"><strong>Cancellation:</strong> ${escapeHtml(props.cancellationSnippet)}</p>
<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#444">${escapeHtml(props.supportContactLine)}</p>
<p style="margin:0;font-size:12px;color:#777">— Vestroo Driver Services</p>
</td></tr></table>
</td></tr></table>
</body></html>`
}

/** @deprecated Use `renderAccountTripConfirmationHtml` with real props — kept for registry smoke until callers pass props. */
export function getAccountTripConfirmationStubHtml(): string {
	return renderAccountTripConfirmationHtml({
		customerName: 'Customer',
		bookingReference: '—',
		pickupDateTimeLabel: '—',
		originLabel: '—',
		destinationLabel: '—',
		vehicleName: '—',
		vehicleCategoryLabel: '—',
		driverFullName: '—',
		totalZarLabel: 'R 0,00',
		lineItems: [],
		creditTermsDays: 30,
		cancellationSnippet: ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET,
		supportContactLine: resolveSupportContactLine(),
	})
}
