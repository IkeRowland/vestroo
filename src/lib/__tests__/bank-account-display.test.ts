import { describe, expect, it } from 'vitest'
import {
	getBankAccountForReader,
	maskBankAccountNumberLastFour,
} from '../bank-account-display'
import type { BankAccountSettingsValue } from '../bank-account-display'

const sample: BankAccountSettingsValue = {
	bank_name: 'Test Bank',
	account_holder: 'Vestroo (Pty) Ltd',
	account_number: '1234567890',
	branch_code: '250655',
	reference_format: 'VST-{booking_ref}',
}

describe('maskBankAccountNumberLastFour', () => {
	it('masks to ***last4 when length is at least 4', () => {
		expect(maskBankAccountNumberLastFour('1234567890')).toBe('***7890')
	})

	it('fully redacts when fewer than 4 characters', () => {
		expect(maskBankAccountNumberLastFour('12')).toBe('****')
		expect(maskBankAccountNumberLastFour('')).toBe('****')
	})
})

describe('getBankAccountForReader', () => {
	it('returns full value for admin', () => {
		const out = getBankAccountForReader('admin', sample)
		expect(out).not.toBeNull()
		expect(out?.account_number).toBe('1234567890')
		expect(out?.bank_name).toBe('Test Bank')
	})

	it('returns masked account_number for dispatcher', () => {
		const out = getBankAccountForReader('dispatcher', sample)
		expect(out).not.toBeNull()
		expect(out?.account_number).toBe('***7890')
		expect(out?.bank_name).toBe('Test Bank')
	})

	it('returns null for chauffeur and customer', () => {
		expect(getBankAccountForReader('chauffeur', sample)).toBeNull()
		expect(getBankAccountForReader('customer', sample)).toBeNull()
	})

	it('returns null for non-object value', () => {
		expect(getBankAccountForReader('admin', null)).toBeNull()
		expect(getBankAccountForReader('dispatcher', 'nope')).toBeNull()
	})

	it('masks empty or short account_number for dispatcher', () => {
		expect(
			getBankAccountForReader('dispatcher', { ...sample, account_number: '' })
				?.account_number,
		).toBe('****')
		expect(
			getBankAccountForReader('dispatcher', { ...sample, account_number: '12' })
				?.account_number,
		).toBe('****')
	})

	it('coerces non-string account_number to string before masking (dispatcher)', () => {
		const out = getBankAccountForReader(
			'dispatcher',
			{ ...sample, account_number: 10001234 } as unknown,
		)
		expect(out?.account_number).toBe('***1234')
	})
})
