import { describe, expect, it } from 'vitest'

import { deriveRiderTrackMilestones } from '../milestones'

const created = '2026-04-01T08:00:00.000Z'
const start = '2026-04-01T09:30:00.000Z'
const end = '2026-04-01T11:00:00.000Z'

describe('deriveRiderTrackMilestones', () => {
	it('marks en_route current with pickup subline', () => {
		const m = deriveRiderTrackMilestones({
			status: 'en_route',
			createdAtIso: created,
			timeStartEstimateIso: start,
			timeEndEstimateIso: end,
		})
		const enRoute = m.find((x) => x.key === 'driver_en_route')
		expect(enRoute?.state).toBe('current')
		expect(enRoute?.subline).toMatch(/Pickup from approximately/)
	})

	it('marks all past when completed', () => {
		const m = deriveRiderTrackMilestones({
			status: 'completed',
			createdAtIso: created,
			timeStartEstimateIso: start,
			timeEndEstimateIso: end,
		})
		expect(m.every((x) => x.state === 'past')).toBe(true)
	})

	it('uses cancelled state for cancelled trips', () => {
		const m = deriveRiderTrackMilestones({
			status: 'cancelled',
			createdAtIso: created,
			timeStartEstimateIso: start,
			timeEndEstimateIso: end,
		})
		expect(m.every((x) => x.state === 'cancelled')).toBe(true)
	})
})
