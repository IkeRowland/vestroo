import type { SupabaseClient } from '@supabase/supabase-js'

import {
	auditCommsMatrixPreSendBlocked,
	getOpsAutomationAuditActorId,
	loadCommsEmailMatrixGate,
	sendCommsMatrixEmailDispatches,
} from '@/lib/comms'
import {
	OPS_AUDIT_ACTION_INVOICE_DUE_REMINDER_SENT,
	OPS_AUDIT_ACTION_INVOICE_DUE_REMINDER_SKIPPED_DUPLICATE,
	type InvoiceDueReminderPhase,
} from '@/lib/invoice-due-reminder-constants'
import {
	dueDateYmdForInvoiceReminder,
	formatYmdInTimeZone,
	parseInvoiceReminderEnv,
	resolveReminderPhaseForDueYmd,
} from '@/lib/invoice-due-reminder-windows'
import { renderAccountInvoiceEftAppendHtml } from '@/lib/email/account-invoice-eft-html'
import {
	loadOpsBankAccount,
	type LoadOpsBankAccountResult,
	resolveAccountInvoiceEftReference,
} from '@/lib/email/ops-bank-account-settings'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import {
	INVOICING_BOOKING_SELECT,
	creditTermsDaysForInvoicingRow,
	tripCompletedAtIsoFromBookingTripsEmbed,
} from '@/lib/ops-invoicing-queue'
import type { ClientTypeDb } from '@/types/database.types'

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null
}

function formatAmountZar(total: unknown): string {
	if (typeof total !== 'number' || !Number.isFinite(total)) {
		return '—'
	}
	try {
		return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(total)
	} catch {
		return String(total)
	}
}

async function hasSuccessfulReminderSentForRunDay(
	supabase: SupabaseClient,
	bookingId: string,
	phase: InvoiceDueReminderPhase,
	runYmd: string,
): Promise<boolean> {
	const { data, error } = await supabase
		.from('ops_audit_log')
		.select('id')
		.eq('action', OPS_AUDIT_ACTION_INVOICE_DUE_REMINDER_SENT)
		.eq('payload->>booking_id', bookingId)
		.eq('payload->>phase', phase)
		.eq('payload->>run_date', runYmd)
		.limit(1)
	if (error) {
		console.warn(
			'[vestroo:invoice-reminder] dedupe probe failed; skipping send to avoid duplicates:',
			error.message,
		)
		return true
	}
	return Array.isArray(data) && data.length > 0
}

export type InvoiceDueReminderJobSummary = {
	runYmd: string
	timeZone: string
	candidates: number
	sent: number
	skippedDedupe: number
	noRuleOrTemplate: number
	noDueDate: number
	errors: number
}

/**
 * **15C.7** — matrix dispatch for **`invoice_due_reminder`** (service role, no JWT).
 * **Q20 scope:** `client_type = 'account_client'` AND **`customer_account_id` IS NOT NULL** (walk-ins excluded).
 */
export async function runInvoiceDueReminderJob(input: {
	serviceSupabase: SupabaseClient
	/** Defaults to `new Date()`; inject in unit/integration tests. */
	runAt?: Date
}): Promise<InvoiceDueReminderJobSummary> {
	const { daysBefore, daysOverdue, timeZone } = parseInvoiceReminderEnv()
	const runIso = (input.runAt ?? new Date()).toISOString()
	const runYmd = formatYmdInTimeZone(runIso, timeZone)
	if (!runYmd) {
		console.error('[vestroo:invoice-reminder] could not derive runYmd; aborting job')
		return {
			runYmd: '',
			timeZone,
			candidates: 0,
			sent: 0,
			skippedDedupe: 0,
			noRuleOrTemplate: 0,
			noDueDate: 0,
			errors: 1,
		}
	}

	const automationActorId = getOpsAutomationAuditActorId() ?? undefined
	const sb = input.serviceSupabase
	const matrixGate = await loadCommsEmailMatrixGate(sb, 'invoice_due_reminder', 'email')

	let candidates = 0
	let sent = 0
	let skippedDedupe = 0
	let noRuleOrTemplate = 0
	let noDueDate = 0
	let errors = 0

	let opsBankGate: Extract<LoadOpsBankAccountResult, { ok: true }> | undefined

	const statuses = ['ready_to_invoice', 'invoiced'] as const
	invoiceReminderOuter: for (const status of statuses) {
		const { data: rows, error: qErr } = await sb
			.from('bookings')
			.select(INVOICING_BOOKING_SELECT)
			.eq('status', status)
			.eq('client_type', 'account_client')
			.not('customer_account_id', 'is', null)
			.order('updated_at', { ascending: false })
			.limit(500)

		if (qErr) {
			console.error('[vestroo:invoice-reminder] bookings query failed:', qErr.message)
			errors += 1
			continue
		}

		for (const raw of rows ?? []) {
			if (!isRecord(raw)) continue
			const bookingId = typeof raw.id === 'string' ? raw.id : ''
			if (!bookingId) continue

			const tripIso = tripCompletedAtIsoFromBookingTripsEmbed(raw.booking_trips)
			const creditTerms = creditTermsDaysForInvoicingRow(raw.account_snapshot, raw.customer_accounts)
			const dueYmd = dueDateYmdForInvoiceReminder(tripIso, creditTerms, timeZone)
			if (!dueYmd) {
				noDueDate += 1
				continue
			}

			const phase = resolveReminderPhaseForDueYmd(dueYmd, runYmd, daysBefore, daysOverdue)
			if (!phase) continue

			candidates += 1

			const dup = await hasSuccessfulReminderSentForRunDay(sb, bookingId, phase, runYmd)
			if (dup) {
				skippedDedupe += 1
				if (automationActorId) {
					const skipAudit = await appendOpsAuditLog(sb, {
						actorId: automationActorId,
						actorRole: 'dispatcher',
						action: OPS_AUDIT_ACTION_INVOICE_DUE_REMINDER_SKIPPED_DUPLICATE,
						entity: 'booking',
						entityId: bookingId,
						payload: {
							booking_id: bookingId,
							phase,
							run_date: runYmd,
							event_key: 'invoice_due_reminder',
							log_level: 'debug',
						},
					})
					if (!skipAudit.ok) {
						console.warn('[vestroo:invoice-reminder] skipped_duplicate audit failed:', skipAudit.message)
					}
				}
				continue
			}

			if (!matrixGate.ok) {
				noRuleOrTemplate += 1
				await auditCommsMatrixPreSendBlocked({
					userSupabase: sb,
					serviceSupabase: sb,
					automationActorId,
					kind: matrixGate.kind,
					entity: 'booking',
					entityId: bookingId,
					eventKey: 'invoice_due_reminder',
					channel: 'email',
					bookingId,
				})
				continue
			}

			if (!automationActorId) {
				console.error(
					'[vestroo:invoice-reminder] refusing send for booking',
					bookingId,
					'set OPS_AUTOMATION_AUDIT_ACTOR_ID to persist invoice_due_reminder_sent audits (AC6 dedupe).',
				)
				errors += 1
				continue
			}

			if (!opsBankGate) {
				const bankLoad = await loadOpsBankAccount(sb)
				if (!bankLoad.ok) {
					console.error(
						'[vestroo:invoice-reminder] ops_settings.bank_account incomplete — cannot send invoice reminders with EFT instructions:',
						bankLoad.message,
					)
					errors += 1
					break invoiceReminderOuter
				}
				opsBankGate = bankLoad
			}

			const bookingRef =
				typeof raw.payment_reference === 'string' && raw.payment_reference.trim() !== ''
					? raw.payment_reference.trim()
					: bookingId
			const totalAmount = raw.total_amount

			const eftReference = resolveAccountInvoiceEftReference({
				rawInvoiceReferenceFormat: opsBankGate.rawInvoiceReferenceFormat,
				externalInvoiceRef: raw.external_invoice_ref,
				paymentReferenceField: raw.payment_reference,
				bookingRefLabel: bookingRef,
			})

			const appendInvoiceEftHtml = renderAccountInvoiceEftAppendHtml({
				bankAccount: opsBankGate.bankAccount,
				paymentReference: eftReference,
				amountZarLabel: formatAmountZar(totalAmount),
			})

			const templateVariableMap: Record<string, string> = {
				booking_id: bookingId,
				due_date: dueYmd,
				amount: formatAmountZar(totalAmount),
				invoice_number: eftReference,
			}

			const sendResult = await sendCommsMatrixEmailDispatches({
				serviceSupabase: sb,
				userSupabase: sb,
				automationActorId,
				eventKey: 'invoice_due_reminder',
				channel: 'email',
				entity: 'booking',
				entityId: bookingId,
				bookingId,
				booking: {
					client_type: (raw.client_type as ClientTypeDb) ?? 'account_client',
					customer_email: typeof raw.customer_email === 'string' ? raw.customer_email : null,
					customer_id: typeof raw.customer_id === 'string' ? raw.customer_id : null,
					customer_account_id:
						typeof raw.customer_account_id === 'string' ? raw.customer_account_id : null,
					account_snapshot: raw.account_snapshot ?? null,
					rider_email: typeof raw.rider_email === 'string' ? raw.rider_email : null,
				},
				bookingRefLabel: bookingRef,
				templateVariableMap,
				appendBeforeComplianceFooterHtml: appendInvoiceEftHtml,
				snapshot: matrixGate.snapshot,
				getFallbackEmail: async () => ({
					subject: `Invoice due reminder · ${bookingRef}`,
					html: `<p>Invoice reminder (${phase.replace('_', ' ')}) for booking <strong>${bookingId}</strong>.</p><p>Due date: <strong>${dueYmd}</strong>. Amount: <strong>${formatAmountZar(totalAmount)}</strong>.</p><p>EFT payment reference: <strong>{{invoice_number}}</strong>.</p>`,
				}),
				baseIdempotencyKey: `invoice-due-reminder:${phase}:${runYmd}:${bookingId}`,
			})

			if (sendResult.outcome === 'no_recipients') {
				noRuleOrTemplate += 1
				continue
			}
			if (sendResult.outcome === 'failed') {
				errors += 1
				console.error('[vestroo:invoice-reminder] send failed booking', bookingId, sendResult.message)
				continue
			}

			sent += 1
			if (automationActorId) {
				const audit = await appendOpsAuditLog(sb, {
					actorId: automationActorId,
					actorRole: 'dispatcher',
					action: OPS_AUDIT_ACTION_INVOICE_DUE_REMINDER_SENT,
					entity: 'booking',
					entityId: bookingId,
					payload: {
						booking_id: bookingId,
						phase,
						run_date: runYmd,
						event_key: 'invoice_due_reminder',
						due_date: dueYmd,
					},
				})
				if (!audit.ok) {
					console.error('[vestroo:invoice-reminder] sent audit append failed:', audit.message)
				}
			}
		}
	}

	console.info(
		'[vestroo:invoice-reminder] summary',
		JSON.stringify({
			runYmd,
			timeZone,
			candidates,
			sent,
			skippedDedupe,
			noRuleOrTemplate,
			noDueDate,
			errors,
		}),
	)

	return {
		runYmd,
		timeZone,
		candidates,
		sent,
		skippedDedupe,
		noRuleOrTemplate,
		noDueDate,
		errors,
	}
}
