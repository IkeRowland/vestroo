/**
 * Account billing archive list URL state — **`/account/billing/invoices`** & **`/account/billing/quotes`**
 * (**Story 18.6** / **FE.18.5**); legacy **`/account/invoices`** redirects here. Namespaced pagination; legacy **`status=open`** preserved on invoices.
 */

export const ACCOUNT_BILLING_INVOICES_LIST_PATH = '/account/billing/invoices' as const
export const ACCOUNT_BILLING_QUOTES_LIST_PATH = '/account/billing/quotes' as const

export type AccountBillingArchiveListPath =
	| typeof ACCOUNT_BILLING_INVOICES_LIST_PATH
	| typeof ACCOUNT_BILLING_QUOTES_LIST_PATH

export const ACCOUNT_INVOICES_LIST_PAGE_SIZE = 25

export const ACCOUNT_INVOICES_LIST_MAX_PAGE = 200

/** Namespaced list params (avoid clashing with legacy **`status=open`**). */
export const ACCT_INV_PARAM = {
	page: 'acct_page',
	per: 'acct_per',
} as const

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type AccountInvoicesListParsed = {
	page: number
	perPage: number
	/** `booking_quotes.id` or `bookings.id` — drives detail rail when set. */
	selectedInvoiceId: string | null
	/** Dashboard deep link — **`?status=open`** (not namespaced). */
	openOnly: boolean
}

function allParamValues(raw: Record<string, string | string[] | undefined>, key: string): string[] {
	const v = raw[key]
	if (v === undefined) return []
	const arr = Array.isArray(v) ? v : [v]
	const out: string[] = []
	for (const s of arr) {
		const t = (s ?? '').trim()
		if (!t) continue
		if (t.includes(',')) {
			for (const part of t.split(',')) {
				const p = part.trim()
				if (p) out.push(p)
			}
		} else {
			out.push(t)
		}
	}
	return out
}

function parsePage(raw: Record<string, string | string[] | undefined>): number {
	const v = allParamValues(raw, ACCT_INV_PARAM.page)[0]
	const n = v ? Number.parseInt(v, 10) : 1
	if (!Number.isFinite(n) || n < 1) return 1
	return Math.min(n, ACCOUNT_INVOICES_LIST_MAX_PAGE)
}

function parsePer(raw: Record<string, string | string[] | undefined>): number {
	const v = allParamValues(raw, ACCT_INV_PARAM.per)[0]
	const n = v ? Number.parseInt(v, 10) : ACCOUNT_INVOICES_LIST_PAGE_SIZE
	if (!Number.isFinite(n) || n < 1) return ACCOUNT_INVOICES_LIST_PAGE_SIZE
	return Math.min(n, 50)
}

function parseSelectedInvoiceId(raw: Record<string, string | string[] | undefined>): string | null {
	const s = (allParamValues(raw, 'id')[0] ?? '').trim()
	if (!s || !UUID_RE.test(s)) return null
	return s
}

function parseOpenOnly(raw: Record<string, string | string[] | undefined>): boolean {
	return allParamValues(raw, 'status')[0] === 'open'
}

export function parseAccountInvoicesListSearchParams(
	raw: Record<string, string | string[] | undefined>,
): AccountInvoicesListParsed {
	return {
		page: parsePage(raw),
		perPage: parsePer(raw),
		selectedInvoiceId: parseSelectedInvoiceId(raw),
		openOnly: parseOpenOnly(raw),
	}
}

export function serializeAccountInvoicesListSearchParams(p: AccountInvoicesListParsed): string {
	const u = new URLSearchParams()
	if (p.page > 1) u.set(ACCT_INV_PARAM.page, String(p.page))
	if (p.perPage !== ACCOUNT_INVOICES_LIST_PAGE_SIZE) u.set(ACCT_INV_PARAM.per, String(p.perPage))
	if (p.selectedInvoiceId) u.set('id', p.selectedInvoiceId)
	if (p.openOnly) u.set('status', 'open')
	return u.toString()
}

export function accountInvoicesListPathWithQuery(
	p: AccountInvoicesListParsed,
	listPath: AccountBillingArchiveListPath = ACCOUNT_BILLING_INVOICES_LIST_PATH,
): string {
	const qs = serializeAccountInvoicesListSearchParams(p)
	return qs.length > 0 ? `${listPath}?${qs}` : listPath
}

export function accountInvoicesListHref(
	current: AccountInvoicesListParsed,
	overrides: Partial<AccountInvoicesListParsed>,
	listPath: AccountBillingArchiveListPath = ACCOUNT_BILLING_INVOICES_LIST_PATH,
): string {
	const next: AccountInvoicesListParsed = {
		page: overrides.page !== undefined ? overrides.page : current.page,
		perPage: overrides.perPage !== undefined ? overrides.perPage : current.perPage,
		selectedInvoiceId:
			overrides.selectedInvoiceId !== undefined ? overrides.selectedInvoiceId : current.selectedInvoiceId,
		openOnly: overrides.openOnly !== undefined ? overrides.openOnly : current.openOnly,
	}
	return accountInvoicesListPathWithQuery(next, listPath)
}

export function accountInvoicesListSearchExcludingPage(p: AccountInvoicesListParsed): string {
	const u = new URLSearchParams(serializeAccountInvoicesListSearchParams(p))
	u.delete(ACCT_INV_PARAM.page)
	return u.toString()
}

export function sliceAccountInvoiceRowsForPage<T>(
	rows: T[],
	page: number,
	perPage: number,
): { slice: T[]; total: number } {
	const total = rows.length
	const safePage = Math.max(1, page)
	const from = (safePage - 1) * perPage
	return { slice: rows.slice(from, from + perPage), total }
}
