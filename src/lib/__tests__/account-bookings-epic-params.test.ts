import { describe, expect, it } from 'vitest'

import {
	parseAccountBookingsListSearchParams,
	serializeAccountBookingsListSearchParams,
} from '@/lib/account-bookings-list-query'

describe('account bookings epic URL presets (Story 18.4)', () => {
	it('parses period=this_month and status=upcoming', () => {
		const p = parseAccountBookingsListSearchParams({
			period: 'this_month',
			status: 'upcoming',
		})
		expect(p.epicPeriodThisMonth).toBe(true)
		expect(p.epicStatusUpcoming).toBe(true)
	})

	it('round-trips epic flags through serialize', () => {
		const p = parseAccountBookingsListSearchParams({
			period: 'this_month',
			status: 'upcoming',
		})
		const qs = serializeAccountBookingsListSearchParams(p)
		expect(qs).toContain('period=this_month')
		expect(qs).toContain('status=upcoming')
		const again = parseAccountBookingsListSearchParams(Object.fromEntries(new URLSearchParams(qs)))
		expect(again.epicPeriodThisMonth).toBe(true)
		expect(again.epicStatusUpcoming).toBe(true)
	})

	it('Story 18.5: id, acct_q, acct_from/to, acct_trip, round-trip', () => {
		const p = parseAccountBookingsListSearchParams({
			id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
			acct_q: 'CPT',
			acct_from: '2026-04-01',
			acct_to: '2026-04-30',
			acct_trip: ['p2p', 'hourly'],
		})
		expect(p.selectedBookingId).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
		expect(p.search).toBe('CPT')
		expect(p.dateFrom).toBe('2026-04-01')
		expect(p.dateTo).toBe('2026-04-30')
		expect(p.tripTypes).toEqual(['p2p', 'hourly'])
		const qs = serializeAccountBookingsListSearchParams(p)
		const sp = new URLSearchParams(qs)
		const raw: Record<string, string | string[] | undefined> = {}
		for (const key of new Set([...sp.keys()])) {
			const all = sp.getAll(key)
			raw[key] = all.length > 1 ? all : (all[0] ?? undefined)
		}
		const again = parseAccountBookingsListSearchParams(raw)
		expect(again).toEqual(p)
	})
})
