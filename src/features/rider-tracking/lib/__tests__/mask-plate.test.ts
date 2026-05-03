import { describe, expect, it } from 'vitest'

import { maskVehiclePlateForRiderDisplay } from '../mask-plate'

describe('maskVehiclePlateForRiderDisplay', () => {
	it('masks with first two letters uppercase and collapses spaces', () => {
		expect(maskVehiclePlateForRiderDisplay('ca 12 gp')).toBe('CA***')
	})

	it('returns null for empty', () => {
		expect(maskVehiclePlateForRiderDisplay(null)).toBeNull()
		expect(maskVehiclePlateForRiderDisplay('')).toBeNull()
	})

	it('short plates become ***', () => {
		expect(maskVehiclePlateForRiderDisplay('x')).toBe('***')
	})
})
