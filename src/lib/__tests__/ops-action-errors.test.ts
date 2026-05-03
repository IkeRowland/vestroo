import { describe, it, expect } from 'vitest'

import { buildOpsActionFailure, mapOpsActionErrorToMessage } from '@/features/ops/ops-action-errors'

describe('mapOpsActionErrorToMessage', () => {
	it('returns generic message for empty input', () => {
		expect(mapOpsActionErrorToMessage('')).toMatch(/Something went wrong/)
	})

	it('redacts JWT-like strings', () => {
		const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
		expect(mapOpsActionErrorToMessage(jwt)).toMatch(/authentication|configuration/i)
	})

	it('redacts service role references', () => {
		expect(mapOpsActionErrorToMessage('invalid service_role key')).toMatch(/credential/i)
	})

	it('redacts bearer tokens', () => {
		expect(mapOpsActionErrorToMessage('Authorization bearer abc.def.ghi')).toMatch(/credential/i)
	})

	it('passes through short safe user-facing strings', () => {
		expect(mapOpsActionErrorToMessage('Booking not found')).toBe('Booking not found')
	})

	it('maps verbose Postgres errors to generic copy', () => {
		expect(
			mapOpsActionErrorToMessage(`relation "foo" does not exist`),
		).toMatch(/database could not complete/)
	})
})

describe('buildOpsActionFailure', () => {
	it('returns stable error shape with correlation id', () => {
		const res = buildOpsActionFailure('TEST', 'raw internal', 'corr-uuid-1234')
		expect(res.ok).toBe(false)
		expect(res.error.code).toBe('TEST')
		expect(res.error.correlationId).toBe('corr-uuid-1234')
		expect(res.error.message).toBeTruthy()
	})

	it('optional reasonCode for NOT_DISPATCHABLE_ACCOUNT', () => {
		const res = buildOpsActionFailure('NOT_DISPATCHABLE_ACCOUNT', 'Staff copy', 'corr-2', {
			reasonCode: 'credit_limit_exceeded',
		})
		expect(res.error.reasonCode).toBe('credit_limit_exceeded')
	})

	it('optional detail for NOT_DISPATCHABLE_ACCOUNT', () => {
		const res = buildOpsActionFailure('NOT_DISPATCHABLE_ACCOUNT', 'Staff copy', 'corr-3', {
			reasonCode: 'credit_limit_exceeded',
			detail: { outstanding_zar: 1, this_booking_zar: 2, credit_limit_zar: 3 },
		})
		expect(res.error.detail?.outstanding_zar).toBe(1)
	})
})
