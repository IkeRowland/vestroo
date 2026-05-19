import { describe, expect, it } from 'vitest'

import {
	fleetVehicleClassificationLabel,
	fleetVehicleMatchesBookingVehicleClass,
	normalizeOpsVehicleClassificationLabel,
} from '@/lib/ops-booking-vehicle-class-match'

describe('ops-booking-vehicle-class-match', () => {
	it('normalizes labels for comparison', () => {
		expect(normalizeOpsVehicleClassificationLabel('  Minibus  class  ')).toBe('minibus class')
	})

	it('builds fleet classification from category name', () => {
		expect(fleetVehicleClassificationLabel('Minibus', 16)).toBe('Minibus class')
	})

	it('matches when requested class aligns with fleet vehicle', () => {
		expect(
			fleetVehicleMatchesBookingVehicleClass('Minibus class', 'Minibus', 16),
		).toBe(true)
	})

	it('rejects mismatch', () => {
		expect(fleetVehicleMatchesBookingVehicleClass('Sedan class', 'Minibus', 16)).toBe(false)
	})

	it('accepts any vehicle when booking has no requested class', () => {
		expect(fleetVehicleMatchesBookingVehicleClass(null, 'SUV', 5)).toBe(true)
		expect(fleetVehicleMatchesBookingVehicleClass('   ', 'SUV', 5)).toBe(true)
	})
})
