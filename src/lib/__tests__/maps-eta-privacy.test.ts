import { describe, expect, it } from 'vitest'

import {
	DEFAULT_ROAD_SPEED_KMH,
	estimateTravelMinutesHaversine,
	haversineDistanceKm,
	roundCoordinatesForPrivacyTier,
} from '@/lib/maps'

describe('maps ETA and privacy helpers', () => {
	it('haversine is symmetric and positive for distinct points', () => {
		const jhb = { lat: -26.2, lng: 28.04 }
		const cpt = { lat: -33.9, lng: 18.42 }
		const d = haversineDistanceKm(jhb, cpt)
		expect(d).toBeGreaterThan(1000)
		expect(haversineDistanceKm(jhb, jhb)).toBe(0)
		expect(haversineDistanceKm(jhb, cpt)).toBeCloseTo(haversineDistanceKm(cpt, jhb), 6)
	})

	it('estimateTravelMinutesHaversine uses default speed', () => {
		const a = { lat: -26.1, lng: 28.0 }
		const b = { lat: -26.2, lng: 28.1 }
		const km = haversineDistanceKm(a, b)
		const mins = estimateTravelMinutesHaversine(a, b, DEFAULT_ROAD_SPEED_KMH)
		const expected = Math.max(1, Math.round((km / DEFAULT_ROAD_SPEED_KMH) * 60))
		expect(mins).toBe(expected)
	})

	it('roundCoordinatesForPrivacyTier coarsens VIP more than corporate', () => {
		const lat = -26.1234567
		const lng = 28.9876543
		const vip = roundCoordinatesForPrivacyTier(lat, lng, 'vip')
		const corp = roundCoordinatesForPrivacyTier(lat, lng, 'corporate')
		const staff = roundCoordinatesForPrivacyTier(lat, lng, 'staff')
		expect(staff.lat).toBe(lat)
		expect(vip.lat).toBe(-26.123)
		expect(corp.lat).toBe(-26.1235)
	})
})
