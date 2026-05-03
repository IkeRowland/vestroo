import { LayoutDashboard } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import {
	filterOpsNavGroups,
	getOpsBreadcrumbs,
	OPS_NAV_GROUPS,
	type OpsNavGroup,
} from '@/features/ops/ops-nav-config'

describe('getOpsBreadcrumbs', () => {
	it('returns operations root and segments for board', () => {
		expect(getOpsBreadcrumbs('/ops/board')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/board', label: 'Board' },
		])
	})

	it('labels close protection engagement segment', () => {
		expect(
			getOpsBreadcrumbs('/ops/close-protection/eng-123'),
		).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/close-protection', label: 'Close protection' },
			{ href: '/ops/close-protection/eng-123', label: 'Engagement' },
		])
	})

	it('returns empty for non-ops paths', () => {
		expect(getOpsBreadcrumbs('/book/search')).toEqual([])
	})

	it('labels comms registry segment', () => {
		expect(getOpsBreadcrumbs('/ops/comms')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/comms', label: 'Comms registry' },
		])
	})

	it('labels dispatch suggestions calibration report path', () => {
		expect(getOpsBreadcrumbs('/ops/reports/suggestions')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/reports', label: 'Reports' },
			{ href: '/ops/reports/suggestions', label: 'Suggestions' },
		])
	})

	it('labels walk-in and accounts workflow paths', () => {
		expect(getOpsBreadcrumbs('/ops/walk-in')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/walk-in', label: 'Walk-in bookings' },
		])
		expect(
			getOpsBreadcrumbs('/ops/accounts/b2222222-2222-4222-8222-222222222222'),
		).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/accounts', label: 'Account bookings' },
			{
				href: '/ops/accounts/b2222222-2222-4222-8222-222222222222',
				label: 'Detail',
			},
		])
	})

	it('labels dispatch and future ops segments (US-A3)', () => {
		expect(getOpsBreadcrumbs('/ops/dispatch')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/dispatch', label: 'Dispatch' },
		])
		expect(
			getOpsBreadcrumbs('/ops/drivers/a1111111-1111-4111-8111-111111111111'),
		).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/drivers', label: 'Drivers' },
			{
				href: '/ops/drivers/a1111111-1111-4111-8111-111111111111',
				label: 'Detail',
			},
		])
		expect(getOpsBreadcrumbs('/ops/live')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/live', label: 'Live tracking' },
		])
		expect(getOpsBreadcrumbs('/ops/service-areas')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/service-areas', label: 'Service areas' },
		])
		expect(getOpsBreadcrumbs('/ops/admin')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/admin', label: 'Admin' },
		])
		expect(getOpsBreadcrumbs('/ops/roles')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/roles', label: 'Roles & permissions' },
		])
		expect(getOpsBreadcrumbs('/ops/settings/profile')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/settings', label: 'Settings' },
			{ href: '/ops/settings/profile', label: 'Profile' },
		])
		expect(getOpsBreadcrumbs('/ops/alerts')).toEqual([
			{ href: '/ops', label: 'Operations' },
			{ href: '/ops/alerts', label: 'Alerts' },
		])
	})
})

describe('OPS_NAV_GROUPS / filterOpsNavGroups (Story 16.22)', () => {
	const fulfilment = () => OPS_NAV_GROUPS.find((g) => g.id === 'fulfilment')

	it('lists unified Bookings queue in fulfilment (no separate walk-in / accounts nav)', () => {
		const g = fulfilment()
		expect(g).toBeDefined()
		const hrefs = g!.items.map((i) => i.href)
		expect(hrefs).toContain('/ops/bookings')
		expect(hrefs).not.toContain('/ops/walk-in')
		expect(hrefs).not.toContain('/ops/accounts')
		const bookingsIdx = hrefs.indexOf('/ops/bookings')
		expect(bookingsIdx).toBeGreaterThan(hrefs.indexOf('/ops'))
	})

	it('exposes fulfilment primary items without legacy shortcuts', () => {
		const g = fulfilment()
		expect(g?.legacyItems).toBeUndefined()
		const hrefs = g!.items.map((i) => i.href)
		expect(hrefs).not.toContain('/ops/board')
		expect(hrefs).not.toContain('/ops/fulfil')
		expect(hrefs).not.toContain('/ops/search')
	})

	it('does not scope Bookings to OPS_PRIMARY_WORKFLOW_QUEUE_ROLES', () => {
		const g = fulfilment()
		const bookings = g?.items.find((i) => i.href === '/ops/bookings')
		expect(bookings?.visibleRoles).toBeUndefined()
	})

	it('filterOpsNavGroups omits legacy block when none configured', () => {
		const filtered = filterOpsNavGroups(OPS_NAV_GROUPS, 'dispatcher')
		const g = filtered.find((x) => x.id === 'fulfilment')
		expect(g?.legacyItems).toBeUndefined()
		expect(g?.items.some((i) => i.href === '/ops/bookings')).toBe(true)
	})

	it('filterOpsNavGroups for admin matches dispatcher fulfilment shape', () => {
		const filtered = filterOpsNavGroups(OPS_NAV_GROUPS, 'admin')
		const g = filtered.find((x) => x.id === 'fulfilment')
		expect(g?.legacyItems).toBeUndefined()
	})
})

describe('OPS_NAV_GROUPS (Story 17.3 — FE.17.3)', () => {
	it('uses Fleet & People and Finance titles (Configuration optional)', () => {
		expect(OPS_NAV_GROUPS.map((g) => g.title)).toEqual([
			'Fulfilment',
			'Fleet & People',
			'Finance',
		])
	})

	it('merges vehicles, clients, and roster under fleet_people', () => {
		const g = OPS_NAV_GROUPS.find((x) => x.id === 'fleet_people')
		expect(g?.items.map((i) => i.href)).toEqual([
			'/ops/vehicles',
			'/ops/clients',
			'/ops/roster',
		])
	})

	it('preserves optional badgeCount on items through filterOpsNavGroups', () => {
		const groups: OpsNavGroup[] = [
			{
				id: 'fulfilment',
				title: 'Test',
				items: [
					{ href: '/x', label: 'X', icon: LayoutDashboard, badgeCount: 4 },
				],
			},
		]
		const filtered = filterOpsNavGroups(groups, 'admin')
		expect(filtered[0]?.items[0]?.badgeCount).toBe(4)
	})
})
