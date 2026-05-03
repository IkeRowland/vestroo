import { describe, expect, it } from 'vitest'

import {
	isReadyToAssignPreset,
	OPS_BOOKINGS_QUEUE_STATUS_ORDER,
	OPS_BOOKINGS_READY_TO_ASSIGN_HREF,
	OPS_BOOKINGS_READY_TO_ASSIGN_STATUS,
	opsBookingsQueueHref,
	opsBookingsPathWithQuery,
	parseOpsBookingsQueueSearchParams,
} from '@/lib/ops-bookings-queue-query'

describe('ready_to_assign preset (14.8)', () => {
	it('exports OPS_BOOKINGS_READY_TO_ASSIGN_STATUS for shared fulfil/bookings queries (14.9)', () => {
		expect(OPS_BOOKINGS_READY_TO_ASSIGN_STATUS).toBe('ready_to_assign')
	})

	it('includes ready_to_assign in the status whitelist / order', () => {
		expect(OPS_BOOKINGS_QUEUE_STATUS_ORDER).toContain('ready_to_assign')
	})

	it('parseOpsBookingsQueueSearchParams exposes ready_to_assign', () => {
		const p = parseOpsBookingsQueueSearchParams({ status: 'ready_to_assign' })
		expect(p.statuses).toEqual(['ready_to_assign'])
		expect(p.page).toBe(1)
		expect(p.perPage).toBe(20)
	})

	it('OPS_BOOKINGS_READY_TO_ASSIGN_HREF is only the status param', () => {
		const u = new URL(OPS_BOOKINGS_READY_TO_ASSIGN_HREF, 'https://example.com')
		expect(u.pathname).toBe('/ops/bookings')
		expect(u.searchParams.get('status')).toBe('ready_to_assign')
		expect(u.searchParams.get('payment')).toBeNull()
	})

	it('isReadyToAssignPreset is true only for the single-status slice with no other filters', () => {
		expect(
			isReadyToAssignPreset(
				parseOpsBookingsQueueSearchParams({ status: 'ready_to_assign' }),
			),
		).toBe(true)
		expect(
			isReadyToAssignPreset(
				parseOpsBookingsQueueSearchParams({ status: 'ready_to_assign', client: 'walk_in' }),
			),
		).toBe(false)
	})

	it('parseOpsBookingsQueueSearchParams reads page and per (17.10)', () => {
		const p = parseOpsBookingsQueueSearchParams({
			status: 'paid',
			page: '3',
			per: '50',
		})
		expect(p.page).toBe(3)
		expect(p.perPage).toBe(50)
		expect(p.statuses).toEqual(['paid'])
	})

	it('opsBookingsPathWithQuery merges filters with pagination params', () => {
		const href = opsBookingsPathWithQuery(
			parseOpsBookingsQueueSearchParams({
				status: 'paid',
				page: '2',
				per: '10',
			}),
		)
		const u = new URL(href, 'https://example.com')
		expect(u.searchParams.get('status')).toBe('paid')
		expect(u.searchParams.get('page')).toBe('2')
		expect(u.searchParams.get('per')).toBe('10')
	})

	it('opsBookingsQueueHref resets page when filters change (preset + pagination regression)', () => {
		const current = parseOpsBookingsQueueSearchParams({
			status: 'paid',
			page: '4',
			per: '10',
		})
		const href = opsBookingsQueueHref(current, {
			statuses: ['cancelled'],
		})
		const u = new URL(href, 'https://example.com')
		expect(u.searchParams.get('status')).toBe('cancelled')
		expect(u.searchParams.get('page')).toBeNull()
		expect(u.searchParams.get('per')).toBe('10')
	})
})
