import { describe, expect, it } from 'vitest'

import {
	addMonthsYm,
	buildOpsFleetDriversHref,
	formatMonthYmFromDate,
	OPS_FLEET_DRIVERS_PATH,
	parseMonthYm,
	parseOpsFleetDriversLayout,
	parseOpsFleetDriversPageView,
	parseFleetDriversDriverArchiveFlag,
	parseFleetDriversDriverEditFlag,
	resolveFleetDriversWeekStartYmd,
} from '@/lib/ops-fleet-drivers-url'

describe('ops-fleet-drivers-url (Story 17.15)', () => {
	it('parseOpsFleetDriversPageView', () => {
		expect(parseOpsFleetDriversPageView({ view: 'month' })).toBe('month')
		expect(parseOpsFleetDriversPageView({})).toBe('week')
	})

	it('parseOpsFleetDriversLayout', () => {
		expect(parseOpsFleetDriversLayout({ driversView: 'grid' })).toBe('grid')
		expect(parseOpsFleetDriversLayout({})).toBe('list')
	})

	it('parseMonthYm', () => {
		expect(parseMonthYm('2026-04')).toBe('2026-04')
		expect(parseMonthYm('2026-13')).toBeNull()
		expect(parseMonthYm('bad')).toBeNull()
	})

	it('buildOpsFleetDriversHref', () => {
		expect(
			buildOpsFleetDriversHref({
				view: 'week',
				weekStartYmd: '2026-04-20',
				monthYm: '2026-04',
				driverId: 'd1',
				tripId: null,
			}),
		).toBe(`${OPS_FLEET_DRIVERS_PATH}?view=week&week=2026-04-20&driver=d1`)
		expect(
			buildOpsFleetDriversHref({
				view: 'week',
				weekStartYmd: '2026-04-20',
				monthYm: '2026-04',
				driverId: 'd1',
				tripId: null,
				driverEdit: true,
			}),
		).toBe(`${OPS_FLEET_DRIVERS_PATH}?view=week&week=2026-04-20&driver=d1&driverEdit=1`)
		expect(
			buildOpsFleetDriversHref({
				view: 'week',
				weekStartYmd: '2026-04-20',
				monthYm: '2026-04',
				driverId: 'd1',
				tripId: null,
				driverArchive: true,
			}),
		).toBe(`${OPS_FLEET_DRIVERS_PATH}?view=week&week=2026-04-20&driver=d1&driverArchive=1`)
		expect(
			buildOpsFleetDriversHref({
				view: 'month',
				weekStartYmd: '2026-04-20',
				monthYm: '2026-05',
				driverId: null,
				tripId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
			}),
		).toBe(
			`${OPS_FLEET_DRIVERS_PATH}?view=month&month=2026-05&id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
		)
		expect(
			buildOpsFleetDriversHref({
				view: 'week',
				weekStartYmd: '2026-04-20',
				monthYm: '2026-04',
				driverId: null,
				tripId: null,
				driversView: 'grid',
			}),
		).toBe(`${OPS_FLEET_DRIVERS_PATH}?view=week&week=2026-04-20&driversView=grid`)
	})

	it('addMonthsYm', () => {
		expect(addMonthsYm('2026-01', 1)).toBe('2026-02')
		expect(addMonthsYm('2026-12', 1)).toBe('2027-01')
	})

	it('resolveFleetDriversWeekStartYmd defaults', () => {
		const y = resolveFleetDriversWeekStartYmd({})
		expect(y).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})

	it('formatMonthYmFromDate', () => {
		expect(formatMonthYmFromDate(new Date(2026, 3, 15))).toBe('2026-04')
	})

	it('parseFleetDrivers driver intent flags', () => {
		expect(parseFleetDriversDriverEditFlag({ driverEdit: '1' })).toBe(true)
		expect(parseFleetDriversDriverEditFlag({})).toBe(false)
		expect(parseFleetDriversDriverArchiveFlag({ driverArchive: '1' })).toBe(true)
		expect(parseFleetDriversDriverArchiveFlag({})).toBe(false)
	})
})
