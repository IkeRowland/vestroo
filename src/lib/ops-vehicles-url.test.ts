import { describe, expect, it } from 'vitest'

import {
	buildOpsVehiclesHref,
	getRawOpsVehiclesSelectedId,
	parseOpsVehiclesPageSelectedId,
	parseOpsVehiclesPageView,
} from '@/lib/ops-vehicles-url'

describe('ops-vehicles-url (Story 17.12)', () => {
	const known = new Set(['v1111111-1111-4111-8111-111111111111'])

	it('parses view', () => {
		expect(parseOpsVehiclesPageView({})).toBe('list')
		expect(parseOpsVehiclesPageView({ view: 'grid' })).toBe('grid')
		expect(parseOpsVehiclesPageView({ view: 'nope' })).toBe('list')
	})

	it('parses id when known', () => {
		expect(parseOpsVehiclesPageSelectedId({ id: 'v1111111-1111-4111-8111-111111111111' }, known)).toBe(
			'v1111111-1111-4111-8111-111111111111',
		)
		expect(parseOpsVehiclesPageSelectedId({ id: 'x' }, known)).toBe(null)
	})

	it('getRawOpsVehiclesSelectedId', () => {
		expect(getRawOpsVehiclesSelectedId({ id: '  a  ' })).toBe('a')
		expect(getRawOpsVehiclesSelectedId({ id: ['b', 'c'] })).toBe('b')
		expect(getRawOpsVehiclesSelectedId({})).toBe(null)
	})

	it('buildOpsVehiclesHref', () => {
		expect(buildOpsVehiclesHref({ view: 'list', id: null })).toBe('/ops/vehicles')
		expect(buildOpsVehiclesHref({ view: 'grid', id: null })).toBe('/ops/vehicles?view=grid')
		expect(buildOpsVehiclesHref({ view: 'list', id: 'v1111111-1111-4111-8111-111111111111' })).toBe(
			'/ops/vehicles?id=v1111111-1111-4111-8111-111111111111',
		)
		expect(
			buildOpsVehiclesHref({ view: 'grid', id: 'v1111111-1111-4111-8111-111111111111' }),
		).toBe('/ops/vehicles?view=grid&id=v1111111-1111-4111-8111-111111111111')
	})
})
