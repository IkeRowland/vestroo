import { describe, expect, it } from 'vitest'

import {
	buildInvoicingBucketRedirectUrl,
	parseOpsInvoicingBucketParam,
	parseOpsInvoicingPageSearchParams,
	serializeOpsInvoicingPaginationQuery,
} from '@/lib/ops-invoicing-url'

describe('ops-invoicing-url (Story 17.16)', () => {
	it('parses bucket aliases', () => {
		expect(parseOpsInvoicingBucketParam('awaiting')).toBe('awaiting')
		expect(parseOpsInvoicingBucketParam(['Completed'])).toBe('completed')
		expect(parseOpsInvoicingBucketParam('overdue')).toBe('overdue')
		expect(parseOpsInvoicingBucketParam('unknown')).toBe(undefined)
	})

	it('redirects bucket → canonical tab + drops bucket', () => {
		expect(buildInvoicingBucketRedirectUrl({ bucket: 'awaiting' })).toBe('/ops/invoicing?tab=invoiced')
		expect(buildInvoicingBucketRedirectUrl({ bucket: 'completed' })).toBe('/ops/invoicing')
		expect(buildInvoicingBucketRedirectUrl({ bucket: 'overdue' })).toBe('/ops/invoicing?tab=invoiced')
	})

	it('merges pagination into invoicing query without dropping tab', () => {
		expect(
			serializeOpsInvoicingPaginationQuery({
				tab: 'invoiced',
				page: 2,
				per: 10,
			}),
		).toBe('tab=invoiced&per=10&page=2')

		expect(
			serializeOpsInvoicingPaginationQuery({
				tab: 'ready',
				page: 1,
				per: 20,
			}),
		).toBe('')
	})

	it('parseOpsInvoicingPageSearchParams reads tab page per', () => {
		const parsed = parseOpsInvoicingPageSearchParams({
			tab: 'invoiced',
			page: '3',
			per: '50',
		})
		expect(parsed.tab).toBe('invoiced')
		expect(parsed.page).toBe(3)
		expect(parsed.per).toBe(50)
	})
})
