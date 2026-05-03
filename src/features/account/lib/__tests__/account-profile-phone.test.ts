import { describe, expect, it } from 'vitest'

import { accountProfilePhoneToE164 } from '@/features/account/lib/account-profile-phone'

describe('accountProfilePhoneToE164', () => {
	it('returns empty string for blank input', () => {
		expect(accountProfilePhoneToE164('', 'ZA')).toBe('')
		expect(accountProfilePhoneToE164('  ', 'ZA')).toBe('')
	})

	it('parses ZA national numbers with default country', () => {
		const v = accountProfilePhoneToE164('0825551234', 'ZA')
		expect(v).toBe('+27825551234')
	})

	it('parses explicit E.164 without default country context', () => {
		expect(accountProfilePhoneToE164('+14155552671', 'ZA')).toBe('+14155552671')
	})

	it('returns null for invalid non-empty input', () => {
		expect(accountProfilePhoneToE164('not-a-phone', 'ZA')).toBeNull()
	})
})
