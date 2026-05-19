import { describe, expect, it } from 'vitest'

import { opsAccountClientDetailPath } from '@/lib/ops-clients-account-url'
import {
	buildOpsClientsHref,
	getRawOpsClientsSelectedId,
	parseOpsClientsPageSearchParams,
} from '@/lib/ops-clients-url'

describe('ops-clients-url (Story 17.11)', () => {
	const known = new Set(['a1111111-1111-4111-8111-111111111111'])

	it('parses id when known', () => {
		expect(
			parseOpsClientsPageSearchParams(
				{ id: 'a1111111-1111-4111-8111-111111111111' },
				known,
			),
		).toBe('a1111111-1111-4111-8111-111111111111')
	})

	it('returns null when id unknown', () => {
		expect(parseOpsClientsPageSearchParams({ id: 'not-in-set' }, known)).toBe(null)
	})

	it('getRawOpsClientsSelectedId returns trimmed first value', () => {
		expect(getRawOpsClientsSelectedId({ id: '  x  ' })).toBe('x')
		expect(getRawOpsClientsSelectedId({ id: ['y', 'z'] })).toBe('y')
		expect(getRawOpsClientsSelectedId({})).toBe(null)
	})

	it('buildOpsClientsHref omits query when no id', () => {
		expect(buildOpsClientsHref({})).toBe('/ops/clients')
		expect(buildOpsClientsHref({ id: null })).toBe('/ops/clients')
		expect(buildOpsClientsHref({ id: '' })).toBe('/ops/clients')
	})

	it('buildOpsClientsHref encodes id', () => {
		expect(buildOpsClientsHref({ id: known.values().next().value! })).toBe(
			'/ops/clients?id=a1111111-1111-4111-8111-111111111111',
		)
	})

	it('opsAccountClientDetailPath encodes account id', () => {
		expect(opsAccountClientDetailPath('a1111111-1111-4111-8111-111111111111')).toBe(
			'/ops/clients/accounts/a1111111-1111-4111-8111-111111111111',
		)
	})
})
