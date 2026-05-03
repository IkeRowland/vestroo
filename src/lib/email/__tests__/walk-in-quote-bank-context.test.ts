import { describe, expect, it, vi } from 'vitest'

import {
	formatBankReference,
	loadWalkInQuoteBankContext,
} from '@/lib/email/walk-in-quote-bank-context'

type FakeRowResult = { data: { value: unknown } | null; error: { message: string } | null }

function fakeSupabase(result: FakeRowResult) {
	const maybeSingle = vi.fn().mockResolvedValue(result)
	const eq = vi.fn().mockReturnValue({ maybeSingle })
	const select = vi.fn().mockReturnValue({ eq })
	const from = vi.fn().mockReturnValue({ select })
	return { from } as unknown as Parameters<typeof loadWalkInQuoteBankContext>[0]
}

describe('formatBankReference', () => {
	it('substitutes {booking_ref} into the configured template', () => {
		expect(formatBankReference('VST-{booking_ref}', 'VST-123')).toBe('VST-VST-123')
		expect(formatBankReference('INV/{booking_ref}/2026', 'B42')).toBe('INV/B42/2026')
	})

	it('falls back to VST-{booking_ref} when the template is missing or whitespace', () => {
		expect(formatBankReference(null, 'B42')).toBe('VST-B42')
		expect(formatBankReference(undefined, 'B42')).toBe('VST-B42')
		expect(formatBankReference('', 'B42')).toBe('VST-B42')
		expect(formatBankReference('   ', 'B42')).toBe('VST-B42')
	})

	it('substitutes every occurrence of {booking_ref} (multiple placeholders)', () => {
		expect(formatBankReference('{booking_ref}-{booking_ref}', 'X')).toBe('X-X')
	})

	it('trims booking ref whitespace before substitution', () => {
		expect(formatBankReference('VST-{booking_ref}', '  X9  ')).toBe('VST-X9')
	})

	it('leaves unrelated copy intact when no placeholder is present', () => {
		expect(formatBankReference('STATIC-REF', 'X')).toBe('STATIC-REF')
	})
})

describe('loadWalkInQuoteBankContext', () => {
	const fullValue = {
		bank_name: 'Acme Bank',
		account_holder: 'Vestroo (Pty) Ltd',
		account_number: '1234567890',
		branch_code: '250655',
		reference_format: 'VST-{booking_ref}',
	}

	it('returns full unmasked DTO + computed reference when ops_settings is healthy', async () => {
		const supabase = fakeSupabase({ data: { value: fullValue }, error: null })
		const res = await loadWalkInQuoteBankContext(supabase, 'VST-123')
		expect(res.ok).toBe(true)
		if (res.ok) {
			expect(res.bankAccount.account_number).toBe('1234567890')
			expect(res.bankAccount.bank_name).toBe('Acme Bank')
			expect(res.paymentReference).toBe('VST-VST-123')
			expect(res.referenceFormat).toBe('VST-{booking_ref}')
		}
	})

	it('uses the VST-{booking_ref} default when reference_format is empty', async () => {
		const supabase = fakeSupabase({
			data: { value: { ...fullValue, reference_format: '' } },
			error: null,
		})
		const res = await loadWalkInQuoteBankContext(supabase, 'B42')
		expect(res.ok).toBe(true)
		if (res.ok) {
			expect(res.paymentReference).toBe('VST-B42')
			expect(res.referenceFormat).toBe('VST-{booking_ref}')
		}
	})

	it('returns NOT_CONFIGURED when no ops_settings row exists', async () => {
		const supabase = fakeSupabase({ data: null, error: null })
		const res = await loadWalkInQuoteBankContext(supabase, 'VST-123')
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error).toBe('NOT_CONFIGURED')
		}
	})

	it('returns NOT_CONFIGURED when value is not a JSON object', async () => {
		const supabase = fakeSupabase({ data: { value: 'oops' }, error: null })
		const res = await loadWalkInQuoteBankContext(supabase, 'VST-123')
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error).toBe('NOT_CONFIGURED')
		}
	})

	it('returns INCOMPLETE when one or more required fields are blank', async () => {
		const supabase = fakeSupabase({
			data: { value: { ...fullValue, account_number: '' } },
			error: null,
		})
		const res = await loadWalkInQuoteBankContext(supabase, 'VST-123')
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error).toBe('INCOMPLETE')
			expect(res.message).toContain('account_number')
		}
	})

	it('returns DATABASE on Supabase error', async () => {
		const supabase = fakeSupabase({ data: null, error: { message: 'connection_refused' } })
		const res = await loadWalkInQuoteBankContext(supabase, 'VST-123')
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error).toBe('DATABASE')
			expect(res.message).toContain('connection_refused')
		}
	})

	it('coerces numeric account_number / branch_code to string before validating non-empty', async () => {
		const supabase = fakeSupabase({
			data: {
				value: { ...fullValue, account_number: 9876543210, branch_code: 250655 },
			},
			error: null,
		})
		const res = await loadWalkInQuoteBankContext(supabase, 'X')
		expect(res.ok).toBe(true)
		if (res.ok) {
			expect(res.bankAccount.account_number).toBe('9876543210')
			expect(res.bankAccount.branch_code).toBe('250655')
		}
	})
})
