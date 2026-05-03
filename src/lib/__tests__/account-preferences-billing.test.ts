import { describe, expect, it } from 'vitest'

import { mergeBillingEntityOptionList } from '@/lib/account-preferences-billing'

describe('mergeBillingEntityOptionList', () => {
	it('dedupes, merges current default, sorts', () => {
		const out = mergeBillingEntityOptionList(['  Zeta ', 'Alpha', 'Alpha', 'beta'], 'gamma')
		expect(out).toHaveLength(4)
		expect(new Set(out)).toEqual(new Set(['Alpha', 'beta', 'gamma', 'Zeta']))
	})

	it('returns empty when no data and no current', () => {
		expect(mergeBillingEntityOptionList([], null)).toEqual([])
	})

	it('includes trimmed current when bookings empty', () => {
		expect(mergeBillingEntityOptionList([], '  solo  ')).toEqual(['solo'])
	})
})
