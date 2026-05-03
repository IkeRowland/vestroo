/**
 * URL helpers for **`/ops/invoicing`** — **`tab`**, optional **`bucket`** aliases (**Story 17.16**),
 * and **`page`/`per`** merge (**Story 17.8**).
 */

import {
	coerceOpsPaginationPage,
	coerceOpsPaginationPerPage,
	type OpsPaginationPerPage,
	OPS_PAGINATION_DEFAULT_PER,
} from '@/features/ops/lib/ops-pagination-url'
import type { OpsInvoicingTabId } from '@/lib/ops-invoicing-queue'
import { parseOpsInvoicingTabParam } from '@/lib/ops-invoicing-queue'

export const OPS_INVOICING_PATH = '/ops/invoicing'

export type OpsInvoicingBucketAlias = 'completed' | 'awaiting' | 'overdue'

export type OpsInvoicingPageParsed = {
	tab: OpsInvoicingTabId
	page: number
	per: OpsPaginationPerPage
	/** Present when URL contained an unknown **`bucket`** value (preserved for observability). */
	rawBucket: string | undefined
}

function first(raw: string | string[] | undefined): string | undefined {
	return Array.isArray(raw) ? raw[0] : raw
}

export function parseOpsInvoicingBucketParam(
	raw: string | string[] | undefined,
): OpsInvoicingBucketAlias | undefined {
	const v = first(raw)?.trim().toLowerCase()
	if (v === 'completed' || v === 'awaiting' || v === 'overdue') {
		return v
	}
	return undefined
}

/**
 * Canonical redirect target when epic **`bucket`** query appears (**FE.17.4** drill contract).
 * Drops **`bucket`** from the URL; preserves other recognized params where possible.
 */
export function buildInvoicingBucketRedirectUrl(
	searchParams: Record<string, string | string[] | undefined>,
): string | null {
	const bucket = parseOpsInvoicingBucketParam(searchParams.bucket)
	if (!bucket) {
		return null
	}

	const params = new URLSearchParams()
	const tab = parseOpsInvoicingTabParam(searchParams.tab)

	if (bucket === 'completed') {
		if (tab !== 'ready') {
			params.set('tab', 'ready')
		}
	} else if (bucket === 'awaiting' || bucket === 'overdue') {
		if (tab !== 'invoiced') {
			params.set('tab', 'invoiced')
		}
	}

	const page = coerceOpsPaginationPage(first(searchParams.page))
	const per = coerceOpsPaginationPerPage(first(searchParams.per))
	if (per !== OPS_PAGINATION_DEFAULT_PER) {
		params.set('per', String(per))
	}
	if (page > 1) {
		params.set('page', String(page))
	}

	const qs = params.toString()
	return qs.length > 0 ? `${OPS_INVOICING_PATH}?${qs}` : OPS_INVOICING_PATH
}

export function parseOpsInvoicingPageSearchParams(
	raw: Record<string, string | string[] | undefined>,
): OpsInvoicingPageParsed {
	const tab = parseOpsInvoicingTabParam(raw.tab)
	const page = coerceOpsPaginationPage(first(raw.page))
	const per = coerceOpsPaginationPerPage(first(raw.per))
	const b = first(raw.bucket)?.trim()
	return {
		tab,
		page,
		per,
		rawBucket: b && b.length > 0 ? b : undefined,
	}
}

/**
 * Query string (no `?`) for **`OpsPagination`** — preserves **`tab`** and pagination keys.
 */
export function serializeOpsInvoicingPaginationQuery(input: {
	tab: OpsInvoicingTabId
	page: number
	per: OpsPaginationPerPage
}): string {
	const params = new URLSearchParams()
	if (input.tab !== 'ready') {
		params.set('tab', input.tab)
	}
	if (input.per !== OPS_PAGINATION_DEFAULT_PER) {
		params.set('per', String(input.per))
	}
	if (input.page > 1) {
		params.set('page', String(input.page))
	}
	return params.toString()
}
