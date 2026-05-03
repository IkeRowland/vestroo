import { describe, expect, it } from 'vitest'

import {
	getVehicleFleetStatusKey,
	getVehicleFleetStatusLabel,
	getVehicleFleetStatusPillTone,
} from '@/features/ops/lib/ops-vehicles-fleet-status'

describe('ops-vehicles-fleet-status (Story 17.12)', () => {
	it('on trip wins over maintenance condition when trips active', () => {
		expect(getVehicleFleetStatusKey('maintenance', 1)).toBe('on_trip')
	})

	it('archived before trip count', () => {
		expect(getVehicleFleetStatusKey('archived', 3)).toBe('unavailable')
	})

	it('maps conditions without active trips', () => {
		expect(getVehicleFleetStatusKey('available', 0)).toBe('available')
		expect(getVehicleFleetStatusKey('maintenance', 0)).toBe('maintenance')
		expect(getVehicleFleetStatusKey('reserved', 0)).toBe('unavailable')
	})

	it('label and tone align', () => {
		const k = getVehicleFleetStatusKey('available', 0)
		expect(getVehicleFleetStatusLabel(k)).toBe('Available')
		expect(getVehicleFleetStatusPillTone(k)).toBe('success')
		expect(getVehicleFleetStatusPillTone(getVehicleFleetStatusKey('available', 2))).toBe('info')
	})
})
