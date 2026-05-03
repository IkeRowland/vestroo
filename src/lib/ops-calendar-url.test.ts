import { describe, expect, it } from 'vitest'

import {
	addDaysLocal,
	buildOpsCalendarHref,
	formatYmdLocal,
	getRawCalendarWeekParam,
	OPS_CALENDAR_PATH,
	parseOpsCalendarPageView,
	parseOpsCalendarSelectedEventId,
	parseWeekQueryYmd,
	parseYmdToLocalDate,
	startOfWeekMondayLocal,
} from '@/lib/ops-calendar-url'

describe('ops-calendar-url (Story 17.14)', () => {
	it('startOfWeekMondayLocal: Sunday → prior Monday', () => {
		const sun = new Date(2026, 3, 26)
		const mon = startOfWeekMondayLocal(sun)
		expect(formatYmdLocal(mon)).toBe('2026-04-20')
	})

	it('startOfWeekMondayLocal: Monday stays same', () => {
		const mon = new Date(2026, 3, 20)
		expect(formatYmdLocal(startOfWeekMondayLocal(mon))).toBe('2026-04-20')
	})

	it('parseWeekQueryYmd rejects invalid dates', () => {
		expect(parseWeekQueryYmd('2026-13-40')).toBeNull()
		expect(parseWeekQueryYmd('not-a-date')).toBeNull()
	})

	it('parseWeekQueryYmd accepts valid', () => {
		expect(parseWeekQueryYmd('2026-04-28')).toBe('2026-04-28')
	})

	it('buildOpsCalendarHref merges week, view, id', () => {
		expect(
			buildOpsCalendarHref({
				weekStartYmd: '2026-04-20',
				view: 'week',
				eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
			}),
		).toBe(
			`${OPS_CALENDAR_PATH}?week=2026-04-20&id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
		)
		expect(
			buildOpsCalendarHref({
				weekStartYmd: '2026-04-20',
				view: 'list',
				eventId: null,
			}),
		).toBe(`${OPS_CALENDAR_PATH}?week=2026-04-20&view=list`)
	})

	it('parseOpsCalendarSelectedEventId', () => {
		const known = new Set(['t1'])
		expect(parseOpsCalendarSelectedEventId({ id: 't1' }, known)).toBe('t1')
		expect(parseOpsCalendarSelectedEventId({ id: 'x' }, known)).toBeNull()
	})

	it('parseOpsCalendarPageView', () => {
		expect(parseOpsCalendarPageView({ view: 'list' })).toBe('list')
		expect(parseOpsCalendarPageView({})).toBe('week')
	})

	it('getRawCalendarWeekParam', () => {
		expect(getRawCalendarWeekParam({ week: ' 2026-01-05 ' })).toBe('2026-01-05')
	})

	it('addDaysLocal', () => {
		const d = parseYmdToLocalDate('2026-04-20')
		expect(formatYmdLocal(addDaysLocal(d, 7))).toBe('2026-04-27')
	})
})
