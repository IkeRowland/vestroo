import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
	encodeDispatchOverrideToken,
	getDispatchOverrideSecret,
	isOverridableAccountDispatchReason,
	verifyDispatchOverrideToken,
	type DispatchOverridePayloadV1,
} from '@/lib/dispatch-override-token'

const TEST_SECRET = '0123456789abcdef0123456789abcdef'

describe('dispatch-override-token', () => {
	beforeEach(() => {
		process.env.DISPATCH_OVERRIDE_SECRET = TEST_SECRET
	})
	afterEach(() => {
		delete process.env.DISPATCH_OVERRIDE_SECRET
	})

	it('getDispatchOverrideSecret reads env', () => {
		expect(getDispatchOverrideSecret()).toBe(TEST_SECRET)
	})

	it('roundtrips sign and verify for credit_limit_exceeded', () => {
		const payload: DispatchOverridePayloadV1 = {
			v: 1,
			booking_id: 'b0000000-0000-4000-8000-000000000001',
			reason_code: 'credit_limit_exceeded',
			override_reason: '1234567890 trusted client',
			profile_id: 'a0000000-0000-4000-8000-000000000002',
			exp: Date.now() + 60_000,
		}
		const token = encodeDispatchOverrideToken(payload, TEST_SECRET)
		const v = verifyDispatchOverrideToken(token, TEST_SECRET)
		expect(v.ok).toBe(true)
		if (v.ok) {
			expect(v.payload.booking_id).toBe(payload.booking_id)
			expect(v.payload.override_reason).toBe(payload.override_reason)
		}
	})

	it('rejects tampered token', () => {
		const payload: DispatchOverridePayloadV1 = {
			v: 1,
			booking_id: 'b0000000-0000-4000-8000-000000000001',
			reason_code: 'overdue_invoices',
			override_reason: '1234567890 explanation',
			profile_id: 'a0000000-0000-4000-8000-000000000002',
			exp: Date.now() + 60_000,
		}
		const token = encodeDispatchOverrideToken(payload, TEST_SECRET)
		const broken = `${token.slice(0, -4)}XXXX`
		expect(verifyDispatchOverrideToken(broken, TEST_SECRET).ok).toBe(false)
	})

	it('rejects expired token', () => {
		const payload: DispatchOverridePayloadV1 = {
			v: 1,
			booking_id: 'b0000000-0000-4000-8000-000000000001',
			reason_code: 'overdue_invoices',
			override_reason: '1234567890 explanation',
			profile_id: 'a0000000-0000-4000-8000-000000000002',
			exp: Date.now() - 1000,
		}
		const token = encodeDispatchOverrideToken(payload, TEST_SECRET)
		expect(verifyDispatchOverrideToken(token, TEST_SECRET).ok).toBe(false)
	})

	it('isOverridableAccountDispatchReason', () => {
		expect(isOverridableAccountDispatchReason('credit_limit_exceeded')).toBe(true)
		expect(isOverridableAccountDispatchReason('overdue_invoices')).toBe(true)
		expect(isOverridableAccountDispatchReason('po_required_and_missing')).toBe(false)
	})
})
