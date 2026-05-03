import { describe, expect, it } from 'vitest'

import { isInvoicingDueOverdue } from '@/lib/ops-invoicing-kpis'

describe('ops-invoicing-kpis', () => {
	it('isInvoicingDueOverdue compares UTC calendar YMD strings', () => {
		expect(isInvoicingDueOverdue('2099-01-01')).toBe(false)
		expect(isInvoicingDueOverdue('2000-01-01')).toBe(true)
		expect(isInvoicingDueOverdue(null)).toBe(false)
	})
})
