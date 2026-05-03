import { describe, expect, it } from 'vitest'

import {
	OPS_BOOKING_GRID_DEFAULT_SORT,
	OPS_BOOKING_GRID_MAX_PAGE,
	OPS_BOOKING_GRID_PAGE_SIZE,
	escapeIlikePattern,
	isAllowedOpsBookingGridSort,
	isUuidShaped,
	normalizeOpsBookingGridSortParam,
	opsBookingGridSortOrders,
	parseOpsBookingGridSearchParams,
	serializeOpsBookingGridSearchParams,
} from '@/lib/ops-booking-grid-query'

describe('parseOpsBookingGridSearchParams', () => {
	it('defaults page, sort, and shouldQuery false with no filters', () => {
		const p = parseOpsBookingGridSearchParams({})
		expect(p.page).toBe(1)
		expect(p.sort).toBe(OPS_BOOKING_GRID_DEFAULT_SORT)
		expect(p.pageSize).toBe(OPS_BOOKING_GRID_PAGE_SIZE)
		expect(p.shouldQuery).toBe(false)
	})

	it('sets shouldQuery when q is present', () => {
		const p = parseOpsBookingGridSearchParams({ q: 'VST-' })
		expect(p.shouldQuery).toBe(true)
		expect(p.q).toBe('VST-')
	})

	it('sets shouldQuery when contact or date filters are present', () => {
		expect(
			parseOpsBookingGridSearchParams({ contact: '27' }).shouldQuery,
		).toBe(true)
		expect(
			parseOpsBookingGridSearchParams({ date_from: '2026-01-01' }).shouldQuery,
		).toBe(true)
		expect(
			parseOpsBookingGridSearchParams({ date_to: '2026-01-31' }).shouldQuery,
		).toBe(true)
	})

	it('ignores invalid date strings', () => {
		const p = parseOpsBookingGridSearchParams({ date_from: '01-01-2026' })
		expect(p.dateFrom).toBe(null)
		expect(p.shouldQuery).toBe(false)
	})

	it('accepts valid ISO date (UTC calendar day)', () => {
		const p = parseOpsBookingGridSearchParams({ date_from: '2026-04-19' })
		expect(p.dateFrom).toBe('2026-04-19')
		expect(p.shouldQuery).toBe(true)
	})

	it('parses status, payment_status, booking_intent', () => {
		const p = parseOpsBookingGridSearchParams({
			status: 'paid',
			payment_status: 'paid',
			booking_intent: 'trip_request',
		})
		expect(p.status).toBe('paid')
		expect(p.paymentStatus).toBe('paid')
		expect(p.bookingIntent).toBe('trip_request')
		expect(p.shouldQuery).toBe(true)
	})

	it('rejects unknown booking_intent filter value', () => {
		const p = parseOpsBookingGridSearchParams({
			booking_intent: 'nope',
		})
		expect(p.bookingIntent).toBe('')
		expect(p.shouldQuery).toBe(false)
	})

	it('clamps page to max', () => {
		const p = parseOpsBookingGridSearchParams({
			page: '999',
			q: 'x',
		})
		expect(p.page).toBe(OPS_BOOKING_GRID_MAX_PAGE)
	})

	it('uses first value when search param is an array', () => {
		const p = parseOpsBookingGridSearchParams({
			q: ['ignored', 'keep'],
		})
		expect(p.q).toBe('ignored')
	})
})

describe('normalizeOpsBookingGridSortParam / isAllowedOpsBookingGridSort', () => {
	it('whitelists known sort keys', () => {
		expect(normalizeOpsBookingGridSortParam('pickup_asc')).toBe('pickup_asc')
		expect(isAllowedOpsBookingGridSort('pickup_asc')).toBe(true)
		expect(isAllowedOpsBookingGridSort('created_desc')).toBe(true)
		expect(isAllowedOpsBookingGridSort('pickup_desc')).toBe(true)
		expect(isAllowedOpsBookingGridSort('ref_asc')).toBe(true)
	})

	it('falls back to default for unknown sort', () => {
		expect(normalizeOpsBookingGridSortParam('inject')).toBe(
			OPS_BOOKING_GRID_DEFAULT_SORT,
		)
		expect(isAllowedOpsBookingGridSort('inject')).toBe(false)
	})
})

describe('opsBookingGridSortOrders', () => {
	it('always ends with id tie-breaker', () => {
		for (const sort of [
			'created_desc',
			'pickup_asc',
			'pickup_desc',
			'ref_asc',
		] as const) {
			const orders = opsBookingGridSortOrders(sort)
			expect(orders.at(-1)?.column).toBe('id')
		}
	})

	it('maps created_desc to created_at desc', () => {
		const orders = opsBookingGridSortOrders('created_desc')
		expect(orders[0]).toMatchObject({ column: 'created_at', ascending: false })
	})
})

describe('isUuidShaped', () => {
	it('detects canonical UUID strings', () => {
		expect(
			isUuidShaped('550e8400-e29b-41d4-a716-446655440000'),
		).toBe(true)
		expect(isUuidShaped('not-a-uuid')).toBe(false)
	})
})

describe('escapeIlikePattern', () => {
	it('escapes LIKE metacharacters', () => {
		expect(escapeIlikePattern('100%')).toBe('100\\%')
		expect(escapeIlikePattern('a_b')).toBe('a\\_b')
	})
})

describe('serializeOpsBookingGridSearchParams', () => {
	it('round-trips minimal filter set', () => {
		const p = parseOpsBookingGridSearchParams({
			q: 'ref',
			sort: 'pickup_asc',
			page: '2',
		})
		const qs = serializeOpsBookingGridSearchParams(p)
		expect(qs).toContain('q=ref')
		expect(qs).toContain('sort=pickup_asc')
		expect(qs).toContain('page=2')
	})
})
