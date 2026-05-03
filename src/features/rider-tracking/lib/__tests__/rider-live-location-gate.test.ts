import { describe, expect, it } from 'vitest'

import {
	riderTrackLastUpdatedStaleLabel,
	riderTrackPositionAgeSeconds,
	shouldFetchRiderTrackLivePosition,
	shouldRenderLiveLocationMap,
} from '../rider-live-location-gate'

describe('shouldFetchRiderTrackLivePosition', () => {
	it('is true only when env, account, and en_route', () => {
		expect(
			shouldFetchRiderTrackLivePosition({
				envEnabled: true,
				accountLiveRiderTracking: true,
				tripStatusRaw: 'en_route',
			}),
		).toBe(true)
		expect(
			shouldFetchRiderTrackLivePosition({
				envEnabled: false,
				accountLiveRiderTracking: true,
				tripStatusRaw: 'en_route',
			}),
		).toBe(false)
		expect(
			shouldFetchRiderTrackLivePosition({
				envEnabled: true,
				accountLiveRiderTracking: false,
				tripStatusRaw: 'en_route',
			}),
		).toBe(false)
		expect(
			shouldFetchRiderTrackLivePosition({
				envEnabled: true,
				accountLiveRiderTracking: true,
				tripStatusRaw: 'assigned',
			}),
		).toBe(false)
		expect(
			shouldFetchRiderTrackLivePosition({
				envEnabled: true,
				accountLiveRiderTracking: true,
				tripStatusRaw: 'completed',
			}),
		).toBe(false)
	})
})

describe('shouldRenderLiveLocationMap', () => {
	it('requires finite coords', () => {
		expect(shouldRenderLiveLocationMap(null)).toBe(false)
		expect(shouldRenderLiveLocationMap({ lat: NaN, lng: 1 })).toBe(false)
		expect(shouldRenderLiveLocationMap({ lat: -26, lng: 28 })).toBe(true)
	})
})

describe('riderTrackPositionAgeSeconds', () => {
	it('returns non-negative floor seconds', () => {
		const now = Date.parse('2026-04-01T10:00:30.000Z')
		const iso = '2026-04-01T10:00:00.000Z'
		expect(riderTrackPositionAgeSeconds(iso, now)).toBe(30)
	})
})

describe('riderTrackLastUpdatedStaleLabel', () => {
	it('returns null when fresh within 90s', () => {
		const now = Date.parse('2026-04-01T10:01:00.000Z')
		const iso = '2026-04-01T10:00:30.000Z'
		expect(riderTrackLastUpdatedStaleLabel(iso, now)).toBeNull()
	})

	it('returns Last updated … when older than 90s', () => {
		const now = Date.parse('2026-04-01T10:05:00.000Z')
		const iso = '2026-04-01T10:00:00.000Z'
		const label = riderTrackLastUpdatedStaleLabel(iso, now)
		expect(label).toMatch(/^Last updated /)
		expect(label).toMatch(/ago/)
	})
})
