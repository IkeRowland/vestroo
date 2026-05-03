import { describe, expect, it } from 'vitest'

import { accountDashboardRailStatusPill } from '@/lib/account-dashboard-rail-status'

describe('accountDashboardRailStatusPill', () => {
	it('maps quote pipeline to Pending quote', () => {
		expect(accountDashboardRailStatusPill('quote_sent').label).toBe('Pending quote')
		expect(accountDashboardRailStatusPill('quote_sent').tone).toBe('warning')
	})

	it('maps paid-style statuses to Confirmed', () => {
		expect(accountDashboardRailStatusPill('paid').label).toBe('Confirmed')
		expect(accountDashboardRailStatusPill('paid').tone).toBe('success')
	})

	it('maps assignment statuses to Driver assigned', () => {
		expect(accountDashboardRailStatusPill('assigned').label).toBe('Driver assigned')
		expect(accountDashboardRailStatusPill('assigned').tone).toBe('info')
	})
})
