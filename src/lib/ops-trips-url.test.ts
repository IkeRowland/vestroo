import { describe, expect, it } from 'vitest'

import {
	buildOpsTripsHref,
	getRawOpsTripsSelectedId,
	OPS_TRIPS_PATH,
	parseOpsTripsPageSelectedId,
} from '@/lib/ops-trips-url'

describe('ops-trips-url (Story 17.13)', () => {
	const known = new Set(['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'])

	it('buildOpsTripsHref omits query when no id', () => {
		expect(buildOpsTripsHref({ id: null })).toBe(OPS_TRIPS_PATH)
	})

	it('buildOpsTripsHref sets id', () => {
		expect(buildOpsTripsHref({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })).toBe(
			`${OPS_TRIPS_PATH}?id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
		)
	})

	it('parseOpsTripsPageSelectedId returns null when absent', () => {
		expect(parseOpsTripsPageSelectedId({}, known)).toBeNull()
	})

	it('parseOpsTripsPageSelectedId returns id when valid', () => {
		expect(
			parseOpsTripsPageSelectedId({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, known),
		).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
	})

	it('parseOpsTripsPageSelectedId returns null when unknown', () => {
		expect(parseOpsTripsPageSelectedId({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }, known)).toBeNull()
	})

	it('getRawOpsTripsSelectedId returns raw string', () => {
		expect(getRawOpsTripsSelectedId({ id: '  x  ' })).toBe('x')
	})
})
