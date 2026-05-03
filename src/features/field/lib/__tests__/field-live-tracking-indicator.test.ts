import { describe, expect, it } from 'vitest'

import { buildFieldLiveTrackingIndicatorModel } from '../field-live-tracking-indicator'

describe('buildFieldLiveTrackingIndicatorModel', () => {
	it('hides when there is no customer account (walk-in)', () => {
		expect(
			buildFieldLiveTrackingIndicatorModel({
				customerAccountId: null,
				accountLiveRiderTracking: true,
				envEnabled: true,
			}),
		).toEqual({ show: false, showEnvDisabledSubcopy: false })
	})

	it('hides when account flag is false', () => {
		expect(
			buildFieldLiveTrackingIndicatorModel({
				customerAccountId: 'ca-1',
				accountLiveRiderTracking: false,
				envEnabled: true,
			}),
		).toEqual({ show: false, showEnvDisabledSubcopy: false })
	})

	it('shows primary when account on and env on', () => {
		expect(
			buildFieldLiveTrackingIndicatorModel({
				customerAccountId: 'ca-1',
				accountLiveRiderTracking: true,
				envEnabled: true,
			}),
		).toEqual({ show: true, showEnvDisabledSubcopy: false })
	})

	it('shows primary and env-off subcopy when account on and env off (AC3)', () => {
		expect(
			buildFieldLiveTrackingIndicatorModel({
				customerAccountId: 'ca-1',
				accountLiveRiderTracking: true,
				envEnabled: false,
			}),
		).toEqual({ show: true, showEnvDisabledSubcopy: true })
	})
})
