import { describe, expect, it } from 'vitest'

import {
	buildOpsPaginationHref,
	coerceOpsPaginationPage,
	coerceOpsPaginationPerPage,
	OPS_PAGINATION_DEFAULT_PER,
} from '@/features/ops/lib/ops-pagination-url'

describe('ops-pagination-url', () => {
	it('coerces invalid per to default 20', () => {
		expect(coerceOpsPaginationPerPage(undefined)).toBe(20)
		expect(coerceOpsPaginationPerPage('99')).toBe(20)
		expect(coerceOpsPaginationPerPage('10')).toBe(10)
		expect(coerceOpsPaginationPerPage('50')).toBe(50)
	})

	it('coerces invalid page to 1', () => {
		expect(coerceOpsPaginationPage(undefined)).toBe(1)
		expect(coerceOpsPaginationPage('-3')).toBe(1)
		expect(coerceOpsPaginationPage('5')).toBe(5)
	})

	it('buildOpsPaginationHref omits default page and per', () => {
		expect(
			buildOpsPaginationHref({
				pathname: '/ops/bookings',
				search: '',
				page: 1,
				per: OPS_PAGINATION_DEFAULT_PER,
			}),
		).toBe('/ops/bookings')
	})

	it('preserves unrelated params', () => {
		const href = buildOpsPaginationHref({
			pathname: '/ops/bookings',
			search: 'status=paid&intent=trip_request',
			page: 2,
			per: 10,
		})
		const u = new URL(href, 'http://local.test')
		expect(u.searchParams.get('status')).toBe('paid')
		expect(u.searchParams.get('intent')).toBe('trip_request')
		expect(u.searchParams.get('per')).toBe('10')
		expect(u.searchParams.get('page')).toBe('2')
	})

	it('per change pattern resets to page 1 via caller', () => {
		const href = buildOpsPaginationHref({
			pathname: '/ops/trips',
			search: 'page=5&per=20',
			page: 1,
			per: 50,
		})
		expect(href).toBe('/ops/trips?per=50')
	})

	it('overwrites existing page and per in search string', () => {
		const href = buildOpsPaginationHref({
			pathname: '/ops/bookings',
			search: 'page=3&per=10&q=foo',
			page: 2,
			per: 20,
		})
		const u = new URL(href, 'http://local.test')
		expect(u.pathname).toBe('/ops/bookings')
		expect(u.searchParams.get('q')).toBe('foo')
		expect(u.searchParams.get('page')).toBe('2')
		expect(u.searchParams.get('per')).toBeNull()
	})
})
