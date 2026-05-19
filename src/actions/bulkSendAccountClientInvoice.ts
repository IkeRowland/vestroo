'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createBookingQuote } from '@/actions/bookingQuoteOps'
import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import {
	auditCommsMatrixPreSendBlocked,
	loadCommsEmailMatrixGate,
	sendCommsMatrixEmailDispatches,
} from '@/lib/comms'
import { renderAccountInvoiceEftAppendHtml } from '@/lib/email/account-invoice-eft-html'
import {
	defaultAccountInvoiceSupportLine,
	renderAccountInvoiceHtml,
} from '@/lib/email/templates/account-invoice'
import {
	loadOpsBankAccount,
	resolveAccountInvoiceEftReference,
} from '@/lib/email/ops-bank-account-settings'
import { appendBookingStatusHistoryEntry } from '@/lib/ops-trip-complete-booking-invoice-hook'
import {
	assessBulkInvoiceEligibility,
	bulkInvoiceLineItemLabel,
} from '@/lib/ops-bulk-invoice-eligibility'
import { OPS_BOOKINGS_QUEUE_SELECT, type OpsBookingsQueueRow } from '@/lib/ops-bookings-queue-select'
import {
	creditTermsDaysForInvoicingRow,
	dueDateYmdFromTripCompletedAndCreditDays,
	tripCompletedAtIsoFromBookingTripsEmbed,
} from '@/lib/ops-invoicing-queue'
import { opsAccountClientDetailPath } from '@/lib/ops-clients-account-url'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { resolveSentToEmailForBooking } from '@/lib/booking-quote-sent-email'
import { createServiceRoleClient, createUserServerClient } from '@/lib/supabase/server'
import type { BookingQuoteLineItem } from '@/types/booking-quote'
import type { ClientTypeDb } from '@/types/database.types'

const bulkSendSchema = z.object({
	customerAccountId: z.string().uuid(),
	bookingIds: z.array(z.string().uuid()).min(1).max(50),
	externalInvoiceRef: z.string().max(240).optional().nullable(),
})

export type BulkSendAccountClientInvoiceResult =
	| {
			ok: true
			correlationId: string
			invoiceNumber: string
			quoteId: string
			anchorBookingId: string
			bookingIds: string[]
	  }
	| ReturnType<typeof buildOpsActionFailure>

function roundMoney2(value: number): number {
	return Math.round(value * 100) / 100
}

function lineItemsTotalSum(lineItems: BookingQuoteLineItem[]): number {
	return roundMoney2(lineItems.reduce((acc, row) => acc + row.total_zar, 0))
}

function generateInvoiceNumber(): string {
	const d = new Date()
	const y = d.getUTCFullYear()
	const m = String(d.getUTCMonth() + 1).padStart(2, '0')
	const day = String(d.getUTCDate()).padStart(2, '0')
	const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
	return `INV-${y}${m}${day}-${suffix}`
}

function formatZarLabel(amount: number): string {
	return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

function formatIssueDateLabel(iso: string): string {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return iso
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(d)
}

/**
 * Staff-only: one consolidated invoice email for multiple `ready_to_invoice` account bookings.
 * Uses standard invoice HTML + `invoice_due_reminder` comms matrix (16.16 EFT block).
 */
export async function bulkSendAccountClientInvoiceAction(
	input: unknown,
): Promise<BulkSendAccountClientInvoiceResult> {
	const correlationId = newOpsCorrelationId()
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const parsed = bulkSendSchema.safeParse(input)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid bulk invoice input', correlationId)
	}

	const { customerAccountId, bookingIds } = parsed.data
	const uniqueIds = [...new Set(bookingIds)]
	const invoiceNumber =
		typeof parsed.data.externalInvoiceRef === 'string' &&
		parsed.data.externalInvoiceRef.trim() !== ''
			? parsed.data.externalInvoiceRef.trim()
			: generateInvoiceNumber()

	const supabase = await createUserServerClient()

	const { data: accountRow, error: accountErr } = await supabase
		.from('customer_accounts')
		.select('id, name, credit_terms_days')
		.eq('id', customerAccountId)
		.maybeSingle()

	if (accountErr || !accountRow?.id) {
		return buildOpsActionFailure('NOT_FOUND', 'Account client not found', correlationId)
	}

	const { data: bookingRows, error: bookingsErr } = await supabase
		.from('bookings')
		.select(OPS_BOOKINGS_QUEUE_SELECT)
		.in('id', uniqueIds)
		.eq('customer_account_id', customerAccountId)
		.eq('client_type', 'account_client')

	if (bookingsErr) {
		return buildOpsActionFailure('DATABASE', bookingsErr.message, correlationId)
	}

	const byId = new Map<string, OpsBookingsQueueRow>()
	for (const raw of bookingRows ?? []) {
		byId.set(raw.id as string, raw as OpsBookingsQueueRow)
	}

	const lineItems: BookingQuoteLineItem[] = []
	const eligibleIds: string[] = []
	const ineligible: { bookingId: string; reason: string }[] = []

	for (const id of uniqueIds) {
		const row = byId.get(id)
		if (!row) {
			ineligible.push({ bookingId: id, reason: 'Booking not found for this account.' })
			continue
		}
		const check = assessBulkInvoiceEligibility(row, customerAccountId)
		if (!check.eligible) {
			ineligible.push({ bookingId: id, reason: check.reason })
			continue
		}
		eligibleIds.push(id)
		lineItems.push({
			label: bulkInvoiceLineItemLabel(row, check.bookingReference),
			qty: 1,
			unit_zar: check.amountZar,
			total_zar: check.amountZar,
		})
	}

	if (eligibleIds.length === 0) {
		const hint =
			ineligible.length > 0
				? ineligible.map((e) => `${e.bookingId.slice(0, 8)}…: ${e.reason}`).join(' ')
				: 'No eligible bookings selected.'
		return buildOpsActionFailure('VALIDATION', hint, correlationId, {
			reasonCode: 'NO_ELIGIBLE_BOOKINGS',
		})
	}

	if (ineligible.length > 0) {
		return buildOpsActionFailure(
			'VALIDATION',
			`Some bookings are not invoice-eligible: ${ineligible.map((e) => e.reason).join('; ')}`,
			correlationId,
			{ reasonCode: 'INELIGIBLE_BOOKINGS' },
		)
	}

	const totalZar = lineItemsTotalSum(lineItems)
	const anchorBookingId = [...eligibleIds].sort()[0]!
	const anchorRow = byId.get(anchorBookingId)!
	const creditTermsDays = Math.max(
		0,
		Math.floor(
			typeof accountRow.credit_terms_days === 'number' && Number.isFinite(accountRow.credit_terms_days)
				? accountRow.credit_terms_days
				: creditTermsDaysForInvoicingRow(anchorRow.account_snapshot, anchorRow.customer_accounts),
		),
	)
	const tripIso = tripCompletedAtIsoFromBookingTripsEmbed(anchorRow.booking_trips)
	const dueYmd =
		dueDateYmdFromTripCompletedAndCreditDays(tripIso, creditTermsDays) ??
		dueDateYmdFromTripCompletedAndCreditDays(new Date().toISOString(), creditTermsDays)
	const dueDateLabel = dueYmd ?? '—'
	const issueIso = new Date().toISOString()

	const created = await createBookingQuote(anchorBookingId, lineItems, totalZar, null)
	if (!created.ok) {
		return created
	}

	const invoiceHtml = renderAccountInvoiceHtml({
		customerName: accountRow.name?.trim() || 'Customer',
		invoiceNumber,
		issueDateLabel: formatIssueDateLabel(issueIso),
		dueDateLabel,
		creditTermsDays,
		lineItems,
		totalZarLabel: formatZarLabel(totalZar),
		supportContactLine: defaultAccountInvoiceSupportLine(),
	})

	const { data: anchorBooking, error: anchorErr } = await supabase
		.from('bookings')
		.select(
			'id, client_type, customer_email, customer_id, customer_account_id, account_snapshot, rider_email, payment_reference',
		)
		.eq('id', anchorBookingId)
		.maybeSingle()

	if (anchorErr || !anchorBooking?.id) {
		return buildOpsActionFailure('NOT_FOUND', 'Anchor booking not found', correlationId)
	}

	const emailRes = await resolveSentToEmailForBooking(supabase, {
		client_type: anchorBooking.client_type as ClientTypeDb,
		customer_email: anchorBooking.customer_email as string | null,
		customer_id: anchorBooking.customer_id as string | null,
		customer_account_id: anchorBooking.customer_account_id as string | null,
		account_snapshot: anchorBooking.account_snapshot,
	})
	if (!emailRes.ok) {
		return buildOpsActionFailure('VALIDATION', emailRes.message, correlationId, {
			reasonCode: 'MISSING_RECIPIENT_EMAIL',
		})
	}

	const serviceSb = await createServiceRoleClient()
	const matrixGate = await loadCommsEmailMatrixGate(serviceSb, 'invoice_due_reminder', 'email')
	if (!matrixGate.ok) {
		await auditCommsMatrixPreSendBlocked({
			userSupabase: supabase,
			serviceSupabase: serviceSb,
			staffActorId: gate.session.userId,
			kind: matrixGate.kind,
			entity: 'booking',
			entityId: anchorBookingId,
			eventKey: 'invoice_due_reminder',
			channel: 'email',
			bookingId: anchorBookingId,
			quoteId: created.quoteId,
			correlationId,
		})
		return buildOpsActionFailure(
			'VALIDATION',
			'Invoice email is not configured in the comms matrix (invoice_due_reminder).',
			correlationId,
			{ reasonCode: 'COMMS_MATRIX_NOT_CONFIGURED' },
		)
	}

	const bankLoad = await loadOpsBankAccount(serviceSb)
	if (!bankLoad.ok) {
		return buildOpsActionFailure('VALIDATION', bankLoad.message, correlationId, {
			reasonCode: 'BANK_ACCOUNT_INCOMPLETE',
		})
	}

	const bookingRef =
		typeof anchorBooking.payment_reference === 'string' &&
		anchorBooking.payment_reference.trim() !== ''
			? anchorBooking.payment_reference.trim()
			: anchorBookingId

	const eftReference = resolveAccountInvoiceEftReference({
		rawInvoiceReferenceFormat: bankLoad.rawInvoiceReferenceFormat,
		externalInvoiceRef: invoiceNumber,
		paymentReferenceField: anchorBooking.payment_reference,
		bookingRefLabel: bookingRef,
	})

	const appendEft = renderAccountInvoiceEftAppendHtml({
		bankAccount: bankLoad.bankAccount,
		paymentReference: eftReference,
		amountZarLabel: formatZarLabel(totalZar),
	})

	const sendResult = await sendCommsMatrixEmailDispatches({
		serviceSupabase: serviceSb,
		userSupabase: supabase,
		staffActorId: gate.session.userId,
		eventKey: 'invoice_due_reminder',
		channel: 'email',
		entity: 'booking',
		entityId: anchorBookingId,
		bookingId: anchorBookingId,
		quoteId: created.quoteId,
		correlationId,
		booking: {
			client_type: (anchorBooking.client_type as ClientTypeDb) ?? 'account_client',
			customer_email: anchorBooking.customer_email as string | null,
			customer_id: anchorBooking.customer_id as string | null,
			customer_account_id: anchorBooking.customer_account_id as string | null,
			account_snapshot: anchorBooking.account_snapshot ?? null,
			rider_email: anchorBooking.rider_email as string | null,
		},
		bookingRefLabel: bookingRef,
		templateVariableMap: {
			invoice_number: eftReference,
			amount: formatZarLabel(totalZar),
			due_date: dueDateLabel,
		},
		appendBeforeComplianceFooterHtml: appendEft,
		snapshot: matrixGate.snapshot,
		getFallbackEmail: async () => ({
			subject: `Invoice ${invoiceNumber}`,
			html: invoiceHtml,
		}),
		baseIdempotencyKey: `bulk-invoice:${invoiceNumber}:${anchorBookingId}`,
	})

	if (sendResult.outcome === 'failed') {
		return buildOpsActionFailure('DATABASE', sendResult.message, correlationId)
	}
	if (sendResult.outcome === 'no_recipients') {
		return buildOpsActionFailure(
			'VALIDATION',
			'No invoice email recipient could be resolved for this account.',
			correlationId,
			{ reasonCode: 'NO_RECIPIENTS' },
		)
	}

	const { data: rpcRaw, error: rpcErr } = await supabase.rpc('ops_send_booking_quote_v1', {
		p_quote_id: created.quoteId,
		p_sent_to_email: emailRes.email,
		p_rendered_html: invoiceHtml,
	})

	if (rpcErr) {
		return buildOpsActionFailure('DATABASE', rpcErr.message, correlationId)
	}

	const rpcOk =
		rpcRaw &&
		typeof rpcRaw === 'object' &&
		'ok' in (rpcRaw as Record<string, unknown>) &&
		(rpcRaw as { ok: boolean }).ok === true
	if (!rpcOk) {
		return buildOpsActionFailure('DATABASE', 'Could not mark consolidated quote as sent', correlationId)
	}

	for (const bookingId of eligibleIds) {
		const { data: row } = await supabase
			.from('bookings')
			.select('id, status, status_history')
			.eq('id', bookingId)
			.maybeSingle()

		if (!row?.id) continue
		const status = typeof row.status === 'string' ? row.status : ''
		if (status === 'invoiced') continue
		if (status !== 'ready_to_invoice') continue

		const nextHistory = appendBookingStatusHistoryEntry(
			row.status_history,
			status,
			'invoiced',
			'ops_bulk_invoice',
		)

		const { error: upErr } = await supabase
			.from('bookings')
			.update({
				status: 'invoiced',
				external_invoice_ref: invoiceNumber,
				status_history: nextHistory,
			})
			.eq('id', bookingId)
			.eq('status', 'ready_to_invoice')

		if (upErr) {
			logOpsAction({
				action: 'bulkSendAccountClientInvoiceAction',
				outcome: 'failure',
				level: 'error',
				correlationId,
				bookingId,
				hint: upErr.message,
			})
		}
	}

	await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		action: 'bulk_account_invoice_sent',
		entity: 'customer_accounts',
		entityId: customerAccountId,
		payload: {
			customer_account_id: customerAccountId,
			invoice_number: invoiceNumber,
			booking_ids: eligibleIds,
			anchor_booking_id: anchorBookingId,
			quote_id: created.quoteId,
			total_zar: totalZar,
		},
	})

	logOpsAction({
		action: 'bulkSendAccountClientInvoiceAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: created.quoteId,
		bookingId: anchorBookingId,
		meta: { booking_count: String(eligibleIds.length) },
	})

	revalidatePath('/ops/invoicing')
	revalidatePath('/ops/bookings')
	revalidatePath('/ops/clients')
	revalidatePath(opsAccountClientDetailPath(customerAccountId))

	return {
		ok: true,
		correlationId,
		invoiceNumber,
		quoteId: created.quoteId,
		anchorBookingId,
		bookingIds: eligibleIds,
	}
}
