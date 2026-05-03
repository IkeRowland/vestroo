import { describe, expect, it } from 'vitest'

import {
	formatReasonCodeDate,
	formatZarForReasonCopy,
	getAccountDispatchBlockMessage,
} from '@/features/ops/reason-code-copy'
import type { NotDispatchableAccountDetail } from '@/lib/ops-action-result'

describe('formatZarForReasonCopy', () => {
	it('formats ZAR amounts', () => {
		expect(formatZarForReasonCopy(1234.5)).toMatch(/1\s*234/)
		expect(formatZarForReasonCopy(null)).toBe('—')
	})
})

describe('formatReasonCodeDate', () => {
	it('formats ISO dates', () => {
		expect(formatReasonCodeDate('2026-01-15')).not.toBe('—')
		expect(formatReasonCodeDate(null)).toBe('—')
	})
})

describe('getAccountDispatchBlockMessage', () => {
	it('covers all seven US-A2 reason codes', () => {
		expect(getAccountDispatchBlockMessage('account_on_hold')).toContain('on hold')
		expect(getAccountDispatchBlockMessage('account_suspended')).toContain('suspended')
		expect(getAccountDispatchBlockMessage('po_required_and_missing')).toContain('purchase order')

		expect(
			getAccountDispatchBlockMessage('contract_expired', {
				contract_ends_on: '2025-12-01',
			}),
		).toContain('expired on')

		expect(
			getAccountDispatchBlockMessage('contract_not_yet_active', {
				contract_starts_on: '2026-06-01',
			}),
		).toContain('starts on')

		const creditDetail: NotDispatchableAccountDetail = {
			outstanding_zar: 10000,
			this_booking_zar: 2500,
			credit_limit_zar: 11000,
		}
		const creditMsg = getAccountDispatchBlockMessage('credit_limit_exceeded', creditDetail)
		expect(creditMsg).toContain('Outstanding')
		expect(creditMsg).toContain('this booking')
		expect(creditMsg).toContain('exceeds credit limit')

		expect(
			getAccountDispatchBlockMessage('overdue_invoices', { overdue_invoice_count: 3 }),
		).toContain('3 overdue invoice')
	})

	it('fallback for unknown codes', () => {
		expect(getAccountDispatchBlockMessage('future_unknown_code')).toContain('future_unknown_code')
		expect(getAccountDispatchBlockMessage('future_unknown_code')).toContain('Dispatch is blocked')
	})
})
