import { describe, expect, it } from 'vitest'

import { buildPublicRiderTrackDto } from '../public-rider-track-dto'

describe('buildPublicRiderTrackDto', () => {
	it('exposes call driver only for assigned with phone', () => {
		const dto = buildPublicRiderTrackDto({
			status: 'assigned',
			serviceType: 'Airport',
			createdAtIso: '2026-04-01T08:00:00.000Z',
			timeStartEstimateIso: null,
			timeEndEstimateIso: null,
			vehicleName: 'S-Class',
			licensePlate: 'CA 123 GP',
			driverFullName: 'Jane Doe',
			driverPhone: '+27821234567',
			driverAvatarUrl: null,
			livePosition: null,
		})
		expect(dto.showCallDriver).toBe(true)
		expect(dto.callDriverTelHref).toBe('tel:+27821234567')
	})

	it('hides call driver for booking status', () => {
		const dto = buildPublicRiderTrackDto({
			status: 'booking',
			serviceType: null,
			createdAtIso: '2026-04-01T08:00:00.000Z',
			timeStartEstimateIso: null,
			timeEndEstimateIso: null,
			vehicleName: null,
			licensePlate: null,
			driverFullName: 'Jane Doe',
			driverPhone: '+27821234567',
			driverAvatarUrl: null,
			livePosition: null,
		})
		expect(dto.showCallDriver).toBe(false)
	})

	it('strips live position when trip is completed even if input had coords', () => {
		const dto = buildPublicRiderTrackDto({
			status: 'completed',
			serviceType: 'Charter',
			createdAtIso: '2026-04-01T08:00:00.000Z',
			timeStartEstimateIso: null,
			timeEndEstimateIso: null,
			vehicleName: 'Van',
			licensePlate: null,
			driverFullName: 'Jane Doe',
			driverPhone: null,
			driverAvatarUrl: null,
			livePosition: { lat: -26.1, lng: 28.0, updatedAtIso: '2026-04-01T09:00:00.000Z' },
		})
		expect(dto.livePosition).toBeNull()
	})

	it('passes through live position only for en_route', () => {
		const pos = { lat: -26.1, lng: 28.0, updatedAtIso: '2026-04-01T09:00:00.000Z' }
		const dto = buildPublicRiderTrackDto({
			status: 'en_route',
			serviceType: 'Charter',
			createdAtIso: '2026-04-01T08:00:00.000Z',
			timeStartEstimateIso: null,
			timeEndEstimateIso: null,
			vehicleName: 'Van',
			licensePlate: null,
			driverFullName: 'Jane Doe',
			driverPhone: null,
			driverAvatarUrl: null,
			livePosition: pos,
		})
		expect(dto.livePosition).toEqual(pos)
	})
})
