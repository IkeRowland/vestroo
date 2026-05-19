import type { SupabaseClient } from '@supabase/supabase-js'

import { resolveSentToEmailForBooking } from '@/lib/booking-quote-sent-email'
import { resolveSupportContactLine } from '@/lib/email/email-copy'
import { sendEmail } from '@/lib/email/send'
import {
	buildWalkInAcceptanceConfirmationSubject,
	renderWalkInAcceptanceConfirmationHtml,
} from '@/lib/email/templates/walk-in-acceptance-confirmation'
import type { LoadWalkInQuoteBankContextResult } from '@/lib/email/walk-in-quote-bank-context'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { resolveQuoteLinkOpsAuditActorId } from '@/lib/resolve-quote-link-audit-actor'
import type { BookingRowForQuoteEmail } from '@/lib/booking-quote-sent-email'

type WalkInAcceptEmailBooking = BookingRowForQuoteEmail & {
	id: string
	customer_name: string | null
}

/**
 * First-accept only: sends **`walk-in-acceptance-confirmation`** and writes **`customer_accepted_quote`**
 * audit. Callers must gate on a fresh acceptance (not idempotent reload).
 */
export async function sendWalkInAcceptanceConfirmationForBooking(
	supabase: SupabaseClient,
	args: {
		booking: WalkInAcceptEmailBooking
		quoteId: string
		bank: Extract<LoadWalkInQuoteBankContextResult, { ok: true }>
		bookingRefLabel: string
	},
): Promise<void> {
	const b = args.booking
	const emailRes = await resolveSentToEmailForBooking(supabase, b)
	if (emailRes.ok) {
		const customerName = (b.customer_name ?? '').trim() || 'there'
		const emailProps = {
			customerName,
			bookingReference: args.bookingRefLabel,
			paymentReference: args.bank.paymentReference,
			bankAccount: args.bank.bankAccount,
			supportContactLine: resolveSupportContactLine(),
		}
		const html = renderWalkInAcceptanceConfirmationHtml(emailProps)
		const subject = buildWalkInAcceptanceConfirmationSubject(args.bookingRefLabel)
		const idempotencyKey = `walk-in-accept-confirm-${b.id}`

		const sendRes = await sendEmail({
			to: emailRes.email,
			subject,
			html,
			idempotencyKey,
		})
		if (!sendRes.ok) {
			console.error('[walk-in-accept] sendEmail failed:', sendRes.error.message)
		}
	} else {
		console.error('[walk-in-accept] no recipient email:', emailRes.message)
	}

	const actor = await resolveQuoteLinkOpsAuditActorId(supabase)
	if (!actor.ok) {
		console.error('[walk-in-accept] resolveQuoteLinkOpsAuditActorId failed:', actor.message)
		return
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: actor.actorId,
		actorRole: 'customer',
		action: 'customer_accepted_quote',
		entity: 'bookings',
		entityId: b.id,
		payload: {
			booking_id: b.id,
			quote_id: args.quoteId,
			...(b.customer_id ? { booking_customer_id: b.customer_id } : {}),
		},
	})
	if (!audit.ok) {
		console.error('[walk-in-accept] appendOpsAuditLog failed:', audit.message)
	}
}
