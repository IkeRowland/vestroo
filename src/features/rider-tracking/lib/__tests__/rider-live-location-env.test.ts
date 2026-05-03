import { afterEach, describe, expect, it, vi } from 'vitest'

import { isRiderLiveLocationEnvEnabled } from '../rider-live-location-env'

describe('isRiderLiveLocationEnvEnabled', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('is false when unset', () => {
		vi.stubEnv('RIDER_LIVE_LOCATION_ENABLED', '')
		expect(isRiderLiveLocationEnvEnabled()).toBe(false)
	})

	it('matches SMS-style truthy values', () => {
		vi.stubEnv('RIDER_LIVE_LOCATION_ENABLED', '1')
		expect(isRiderLiveLocationEnvEnabled()).toBe(true)
		vi.stubEnv('RIDER_LIVE_LOCATION_ENABLED', 'true')
		expect(isRiderLiveLocationEnvEnabled()).toBe(true)
		vi.stubEnv('RIDER_LIVE_LOCATION_ENABLED', '0')
		expect(isRiderLiveLocationEnvEnabled()).toBe(false)
	})
})
