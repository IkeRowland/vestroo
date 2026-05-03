import type { OpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'

/**
 * Canonical fleet row status for **`OpsStatusPill`** (Story 17.12 / FE.17.6).
 * Combines **`vehicle_condition`** (catalogue / ops form) with **active non-terminal trips** count.
 */
export type VehicleFleetStatusKey = 'on_trip' | 'available' | 'maintenance' | 'unavailable'

export function getVehicleFleetStatusKey(
	vehicleCondition: string,
	activeTripCount: number,
): VehicleFleetStatusKey {
	const c = (vehicleCondition || 'available').trim().toLowerCase()
	if (c === 'archived') return 'unavailable'
	if (activeTripCount > 0) return 'on_trip'
	if (c === 'maintenance') return 'maintenance'
	if (c === 'reserved') return 'unavailable'
	return 'available'
}

export function getVehicleFleetStatusLabel(key: VehicleFleetStatusKey): string {
	switch (key) {
		case 'on_trip':
			return 'On trip'
		case 'available':
			return 'Available'
		case 'maintenance':
			return 'Maintenance'
		case 'unavailable':
			return 'Unavailable'
		default:
			return 'Unavailable'
	}
}

export function getVehicleFleetStatusPillTone(key: VehicleFleetStatusKey): OpsStatusPillTone {
	switch (key) {
		case 'on_trip':
			return 'info'
		case 'available':
			return 'success'
		case 'maintenance':
			return 'warning'
		case 'unavailable':
			return 'neutral'
		default:
			return 'neutral'
	}
}
