import { describe, expect, it } from 'vitest'

import {
	addMonthsYm,
	buildOpsRosterHref,
	formatMonthYmFromDate,
	OPS_ROSTER_PATH,
	parseMonthYm,
	parseOpsRosterPageView,
	resolveRosterWeekStartYmd,
} from '@/lib/ops-roster-url'

describe('ops-roster-url (Story 17.15)', () => {
	it('parseOpsRosterPageView', () => {
		expect(parseOpsRosterPageView({ view: 'month' })).toBe('month')
		expect(parseOpsRosterPageView({})).toBe('week')
	})

	it('parseMonthYm', () => {
		expect(parseMonthYm('2026-04')).toBe('2026-04')
		expect(parseMonthYm('2026-13')).toBeNull()
		expect(parseMonthYm('bad')).toBeNull()
	})

	it('buildOpsRosterHref', () => {
		expect(
			buildOpsRosterHref({
				view: 'week',
				weekStartYmd: '2026-04-20',
				monthYm: '2026-04',
				driverId: 'd1',
				shiftId: null,
			}),
		).toBe(`${OPS_ROSTER_PATH}?view=week&week=2026-04-20&driver=d1`)
		expect(
			buildOpsRosterHref({
				view: 'month',
				weekStartYmd: '2026-04-20',
				monthYm: '2026-05',
				driverId: null,
				shiftId: 's1',
			}),
		).toBe(`${OPS_ROSTER_PATH}?view=month&month=2026-05&shift=s1`)
	})

	it('addMonthsYm', () => {
		expect(addMonthsYm('2026-01', 1)).toBe('2026-02')
		expect(addMonthsYm('2026-12', 1)).toBe('2027-01')
	})

	it('resolveRosterWeekStartYmd defaults', () => {
		const y = resolveRosterWeekStartYmd({})
		expect(y).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})

	it('formatMonthYmFromDate', () => {
		expect(formatMonthYmFromDate(new Date(2026, 3, 15))).toBe('2026-04')
	})
})
