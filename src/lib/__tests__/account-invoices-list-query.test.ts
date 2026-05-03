import { describe, expect, it } from 'vitest'

import { computeAccountInvoiceKpis, type AccountInvoiceArchiveRow } from '@/lib/account-invoices-archive-query'
import {
	ACCOUNT_INVOICES_LIST_PAGE_SIZE,
	parseAccountInvoicesListSearchParams,
	serializeAccountInvoicesListSearchParams,
	sliceAccountInvoiceRowsForPage,
} from '@/lib/account-invoices-list-query'

function baseRow(over: Partial<AccountInvoiceArchiveRow>): AccountInvoiceArchiveRow {
	return {
		quote_id: 'a1b2c3d4-e5f6-4789-a012-345678901234',
		booking_id: 'b1b2c3d4-e5f6-4789-a012-345678901234',
		booking_reference: 'REF',
		quote_version: 1,
		total_zar: 100,
		quote_status: 'sent',
		booking_status: 'invoiced',
		booking_payment_status: 'pending',
		booking_payment_received_at: null,
		booking_purchase_order_ref: null,
		sent_at: new Date(Date.now() - 20 * 86_400_000).toISOString(),
		accepted_at: null,
		invoiced_at: null,
		paid_at: null,
		quote_created_at: new Date().toISOString(),
		has_rendered_html: true,
		pdf_storage_path: 'q/1.pdf',
		is_booking_pipeline_supplemental: false,
		...over,
	}
}

describe('computeAccountInvoiceKpis', () => {
	it('counts paid in last 90d', () => {
		const rows = [
			baseRow({
				booking_status: 'paid_invoice',
				booking_payment_received_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
			}),
		]
		expect(computeAccountInvoiceKpis(rows, 14)).toEqual({ paid90d: 1, awaitingPayment: 0, overdue: 0 })
	})

	it('counts overdue invoiced rows past credit terms', () => {
		const rows = [
			baseRow({
				booking_status: 'invoiced',
				booking_payment_status: 'pending',
				sent_at: new Date(Date.now() - 40 * 86_400_000).toISOString(),
			}),
		]
		const k = computeAccountInvoiceKpis(rows, 14)
		expect(k.awaitingPayment).toBe(1)
		expect(k.overdue).toBe(1)
	})
})

describe('parseAccountInvoicesListSearchParams', () => {
	it('defaults page 1, per 25, no id, openOnly false', () => {
		expect(parseAccountInvoicesListSearchParams({})).toEqual({
			page: 1,
			perPage: ACCOUNT_INVOICES_LIST_PAGE_SIZE,
			selectedInvoiceId: null,
			openOnly: false,
		})
	})

	it('parses status=open', () => {
		expect(parseAccountInvoicesListSearchParams({ status: 'open' })).toMatchObject({
			openOnly: true,
		})
	})

	it('parses id uuid', () => {
		const id = 'a1b2c3d4-e5f6-4789-a012-345678901234'
		expect(parseAccountInvoicesListSearchParams({ id })).toMatchObject({
			selectedInvoiceId: id,
		})
	})

	it('rejects malformed id', () => {
		expect(parseAccountInvoicesListSearchParams({ id: 'not-a-uuid' })).toMatchObject({
			selectedInvoiceId: null,
		})
	})

	it('round-trips serialize', () => {
		const p = parseAccountInvoicesListSearchParams({
			acct_page: '2',
			status: 'open',
			id: 'a1b2c3d4-e5f6-4789-a012-345678901234',
		})
		const qs = serializeAccountInvoicesListSearchParams(p)
		const again = parseAccountInvoicesListSearchParams(Object.fromEntries(new URLSearchParams(qs)))
		expect(again).toEqual(p)
	})
})

describe('sliceAccountInvoiceRowsForPage', () => {
	it('slices second page', () => {
		const rows = [1, 2, 3, 4, 5].map((n) => ({ n }))
		const { slice, total } = sliceAccountInvoiceRowsForPage(rows, 2, 2)
		expect(total).toBe(5)
		expect(slice).toEqual([{ n: 3 }, { n: 4 }])
	})
})
