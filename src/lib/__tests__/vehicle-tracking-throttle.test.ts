import { describe, expect, it } from 'vitest'

import {
	isVehicleTrackingThrottled,
	VEHICLE_TRACKING_MAX_UPDATES_PER_MINUTE,
	VEHICLE_TRACKING_MIN_INTERVAL_MS,
} from '@/lib/vehicle-tracking-throttle'

describe('vehicle-tracking-throttle', () => {
	it('documents 12 updates per minute cap', () => {
		expect(VEHICLE_TRACKING_MAX_UPDATES_PER_MINUTE).toBe(12)
		expect(VEHICLE_TRACKING_MIN_INTERVAL_MS).toBe(5000)
	})

	it('returns false when no prior timestamp', () => {
		expect(isVehicleTrackingThrottled(undefined, Date.now())).toBe(false)
		expect(isVehicleTrackingThrottled(null, Date.now())).toBe(false)
	})

	it('returns true when within minimum interval', () => {
		const now = Date.now()
		const recent = new Date(now - 2000).toISOString()
		expect(isVehicleTrackingThrottled(recent, now)).toBe(true)
	})

	it('returns false when interval elapsed', () => {
		const now = Date.now()
		const old = new Date(now - VEHICLE_TRACKING_MIN_INTERVAL_MS - 1).toISOString()
		expect(isVehicleTrackingThrottled(old, now)).toBe(false)
	})

	it('returns false for invalid iso', () => {
		expect(isVehicleTrackingThrottled('not-a-date', Date.now())).toBe(false)
	})
})
