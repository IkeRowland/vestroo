import { afterEach, describe, expect, it, vi } from 'vitest'

import {
	buildAccountPreferencesAbsoluteUrl,
	isAccountClientBookingForTests,
} from '@/lib/email/account-preferences-url'

describe('buildAccountPreferencesAbsoluteUrl', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('builds absolute /account/preferences with category query (15.23 contract)', () => {
		vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.vestroo.com')
		expect(buildAccountPreferencesAbsoluteUrl('informational')).toBe(
			'https://app.vestroo.com/account/preferences?category=informational',
		)
		expect(buildAccountPreferencesAbsoluteUrl('marketing')).toBe(
			'https://app.vestroo.com/account/preferences?category=marketing',
		)
	})
})

describe('isAccountClientBookingForTests', () => {
	it('is true for account_client with ids', () => {
		expect(
			isAccountClientBookingForTests('account_client', 'acc-1', 'prf-1'),
		).toBe(true)
	})
	it('is false for walk_in or missing ids', () => {
		expect(isAccountClientBookingForTests('walk_in', 'acc-1', 'p')).toBe(false)
		expect(isAccountClientBookingForTests('account_client', null, 'p')).toBe(false)
	})
})
