import { addCalendarDaysUtc, isoTimestampUtcOnServiceDate, scheduledWindowForPatternDay } from '@/lib/ops-service-run-datetime'

describe('ops-service-run-datetime', () => {
	it('addCalendarDaysUtc rolls UTC calendar dates', () => {
		expect(addCalendarDaysUtc('2026-04-28', 0)).toBe('2026-04-28')
		expect(addCalendarDaysUtc('2026-04-28', 1)).toBe('2026-04-29')
		expect(addCalendarDaysUtc('2026-04-30', 1)).toBe('2026-05-01')
	})

	it('isoTimestampUtcOnServiceDate combines date and HH:MM in UTC', () => {
		expect(isoTimestampUtcOnServiceDate('2026-04-28', '09:30')).toBe('2026-04-28T09:30:00.000Z')
	})

	it('scheduledWindowForPatternDay extends end when end is not after start', () => {
		const w = scheduledWindowForPatternDay('2026-04-28', '18:00', '06:00')
		expect(w).not.toBeNull()
		expect(new Date(w!.scheduled_end).getTime()).toBeGreaterThan(new Date(w!.scheduled_start).getTime())
	})
})
