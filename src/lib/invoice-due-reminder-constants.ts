/**
 * Epic 15 / **15C.7** — `ops_audit_log.action` for scheduled invoice-due reminders (stable strings).
 */
export const OPS_AUDIT_ACTION_INVOICE_DUE_REMINDER_SENT = 'invoice_due_reminder_sent' as const

export const OPS_AUDIT_ACTION_INVOICE_DUE_REMINDER_SKIPPED_DUPLICATE =
	'invoice_due_reminder_skipped_duplicate' as const

export type InvoiceDueReminderPhase = 'pre_due' | 'overdue'

export const INVOICE_REMINDER_JOB_TIME_ZONE_DEFAULT = 'Africa/Johannesburg'
