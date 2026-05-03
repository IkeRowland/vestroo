import type { InvoiceDueReminderPhase } from '@/lib/invoice-due-reminder-constants'
import { INVOICE_REMINDER_JOB_TIME_ZONE_DEFAULT } from '@/lib/invoice-due-reminder-constants'

/**
 * Calendar **`YYYY-MM-DD`** for an instant in **`timeZone`** (IANA), using `en-CA` locale for stable ordering.
 * Epic 15 / **15C.7** — run-date and due-date windows use this TZ (default **Africa/Johannesburg**).
 */
export function formatYmdInTimeZone(isoInstant: string, timeZone: string): string | null {
	const d = new Date(isoInstant)
	if (Number.isNaN(d.getTime())) return null
	const s = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(d)
	return s.length >= 10 ? s.slice(0, 10) : null
}

/** Pure civil-date add on **`YYYY-MM-DD`** (UTC calendar arithmetic on the parsed components). */
export function addCalendarDaysToYmd(ymd: string, deltaDays: number): string | null {
	const parts = ymd.split('-')
	if (parts.length !== 3) return null
	const y = Number(parts[0])
	const mo = Number(parts[1])
	const d = Number(parts[2])
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
	const base = new Date(Date.UTC(y, mo - 1, d))
	if (Number.isNaN(base.getTime())) return null
	base.setUTCDate(base.getUTCDate() + deltaDays)
	const yy = base.getUTCFullYear()
	const mm = String(base.getUTCMonth() + 1).padStart(2, '0')
	const dd = String(base.getUTCDate()).padStart(2, '0')
	return `${yy}-${mm}-${dd}`
}

/**
 * Invoice **due** calendar date: trip **completion** calendar day in **`timeZone`** + **`creditTermsDays`** whole civil days.
 * Aligns with invoicing semantics (civil add), but completion anchor uses org TZ instead of UTC-only.
 */
export function dueDateYmdForInvoiceReminder(
	tripCompletedAtIso: string | null,
	creditTermsDays: number,
	timeZone: string,
): string | null {
	if (!tripCompletedAtIso) return null
	if (Number.isNaN(Date.parse(tripCompletedAtIso))) return null
	const completionYmd = formatYmdInTimeZone(tripCompletedAtIso, timeZone)
	if (!completionYmd) return null
	return addCalendarDaysToYmd(completionYmd, Math.max(0, Math.floor(creditTermsDays)))
}

/**
 * **Pre-due:** `dueYmd === runYmd + INVOICE_REMINDER_DAYS_BEFORE` (due is N civil days **after** run).
 * **Overdue:** `dueYmd === runYmd - INVOICE_REMINDER_DAYS_OVERDUE` (due was N civil days **before** run; default 1 = one calendar day overdue).
 */
export function resolveReminderPhaseForDueYmd(
	dueYmd: string,
	runYmd: string,
	daysBefore: number,
	daysOverdue: number,
): InvoiceDueReminderPhase | null {
	const preTarget = addCalendarDaysToYmd(runYmd, daysBefore)
	const overdueTarget = addCalendarDaysToYmd(runYmd, -daysOverdue)
	if (preTarget && dueYmd === preTarget) {
		return 'pre_due'
	}
	if (overdueTarget && dueYmd === overdueTarget) {
		return 'overdue'
	}
	return null
}

export type InvoiceReminderEnvWindows = {
	daysBefore: number
	daysOverdue: number
	timeZone: string
}

function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
	if (raw === undefined || raw.trim() === '') return fallback
	const n = Number.parseInt(raw.trim(), 10)
	return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** Reads **`INVOICE_REMINDER_*`** env (server / cron only). */
export function parseInvoiceReminderEnv(): InvoiceReminderEnvWindows {
	return {
		daysBefore: parseNonNegativeInt(process.env.INVOICE_REMINDER_DAYS_BEFORE, 3),
		daysOverdue: parseNonNegativeInt(process.env.INVOICE_REMINDER_DAYS_OVERDUE, 1),
		timeZone:
			process.env.INVOICE_REMINDER_TIME_ZONE?.trim() || INVOICE_REMINDER_JOB_TIME_ZONE_DEFAULT,
	}
}
