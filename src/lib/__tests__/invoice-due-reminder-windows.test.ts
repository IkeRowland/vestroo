import { describe, expect, it } from 'vitest'

import {
	addCalendarDaysToYmd,
	dueDateYmdForInvoiceReminder,
	formatYmdInTimeZone,
	resolveReminderPhaseForDueYmd,
} from '@/lib/invoice-due-reminder-windows'

const TZ = 'Africa/Johannesburg'

describe('invoice-due-reminder-windows', () => {
	it('formatYmdInTimeZone uses calendar day in Africa/Johannesburg', () => {
		// 2026-04-25 22:30 UTC = 2026-04-26 00:30 SAST
		const ymd = formatYmdInTimeZone('2026-04-25T22:30:00.000Z', TZ)
		expect(ymd).toBe('2026-04-26')
	})

	it('addCalendarDaysToYmd crosses month boundary', () => {
		expect(addCalendarDaysToYmd('2026-04-28', 3)).toBe('2026-05-01')
		expect(addCalendarDaysToYmd('2026-04-26', -1)).toBe('2026-04-25')
	})

	it('dueDateYmdForInvoiceReminder adds credit terms on completion civil day (JHB)', () => {
		// Completion 2026-04-01 10:00 UTC → still 2026-04-01 in SAST; +0 days → same due
		const due0 = dueDateYmdForInvoiceReminder('2026-04-01T10:00:00.000Z', 0, TZ)
		expect(due0).toBe('2026-04-01')
		const due14 = dueDateYmdForInvoiceReminder('2026-04-01T10:00:00.000Z', 14, TZ)
		expect(due14).toBe('2026-04-15')
	})

	it('resolveReminderPhaseForDueYmd: pre_due when due is exactly run+N days', () => {
		const phase = resolveReminderPhaseForDueYmd('2026-04-29', '2026-04-26', 3, 1)
		expect(phase).toBe('pre_due')
	})

	it('resolveReminderPhaseForDueYmd: overdue when due is exactly run-N days', () => {
		const phase = resolveReminderPhaseForDueYmd('2026-04-25', '2026-04-26', 3, 1)
		expect(phase).toBe('overdue')
	})

	it('resolveReminderPhaseForDueYmd: null when outside windows', () => {
		expect(resolveReminderPhaseForDueYmd('2026-04-30', '2026-04-26', 3, 1)).toBeNull()
		expect(resolveReminderPhaseForDueYmd('2026-04-24', '2026-04-26', 3, 1)).toBeNull()
	})

	it('resolveReminderPhaseForDueYmd: zero days_before matches same calendar day as run', () => {
		expect(resolveReminderPhaseForDueYmd('2026-04-26', '2026-04-26', 0, 1)).toBe('pre_due')
	})
})
