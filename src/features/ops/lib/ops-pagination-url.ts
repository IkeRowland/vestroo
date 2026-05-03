/**
 * URL helpers for **`OpsPagination`** — **`page`** + **`per`** query keys (Story 17.8 / FE.17.10).
 * Canonical: omit **`page`** when **`1`**; omit **`per`** when default (**20**).
 */

export const OPS_PAGINATION_PAGE_PARAM = 'page'
export const OPS_PAGINATION_PER_PARAM = 'per'

export const OPS_PAGINATION_PER_OPTIONS = [10, 20, 25, 50] as const
export type OpsPaginationPerPage = (typeof OPS_PAGINATION_PER_OPTIONS)[number]

export const OPS_PAGINATION_DEFAULT_PER: OpsPaginationPerPage = 20

export function coerceOpsPaginationPerPage(raw: string | undefined): OpsPaginationPerPage {
	const n = Number(raw)
	if (n === 10 || n === 20 || n === 25 || n === 50) {
		return n
	}
	return OPS_PAGINATION_DEFAULT_PER
}

export function coerceOpsPaginationPage(raw: string | undefined): number {
	const n = Number.parseInt(String(raw ?? ''), 10)
	if (!Number.isFinite(n) || n < 1) {
		return 1
	}
	return n
}

function toURLSearchParams(search: string | URLSearchParams): URLSearchParams {
	if (typeof search === 'string') {
		const s = search.trim()
		if (!s) {
			return new URLSearchParams()
		}
		const normalized = s.startsWith('?') ? s.slice(1) : s
		return new URLSearchParams(normalized)
	}
	return new URLSearchParams(search.toString())
}

export type BuildOpsPaginationHrefArgs = {
	pathname: string
	/** Existing query string (no **`?`**) or **`URLSearchParams`** — filters preserved. */
	search: string | URLSearchParams
	page: number
	per: OpsPaginationPerPage
	/** When set (e.g. account **`acct_page`** / **`acct_per`**), overrides default `page` / `per` keys. */
	pageParam?: string
	perParam?: string
	/** When set, treat this as the default for omitting `per` from the query (Story **18.5**). */
	defaultPerForOmit?: number
}

/**
 * Builds an **`href`** with **`page`** / **`per`** merged; other keys unchanged.
 * Changing **`per`** at call sites should pass **`page: 1`** (epic default).
 */
export function buildOpsPaginationHref({
	pathname,
	search,
	page,
	per,
	pageParam = OPS_PAGINATION_PAGE_PARAM,
	perParam = OPS_PAGINATION_PER_PARAM,
	defaultPerForOmit = OPS_PAGINATION_DEFAULT_PER,
}: BuildOpsPaginationHrefArgs): string {
	const params = toURLSearchParams(search)
	params.delete(pageParam)
	params.delete(perParam)
	const defaultPer = defaultForOmitToPerPage(defaultPerForOmit)

	if (per !== defaultPer) {
		params.set(perParam, String(per))
	}
	if (page > 1) {
		params.set(pageParam, String(page))
	}

	const qs = params.toString()
	return qs.length > 0 ? `${pathname}?${qs}` : pathname
}

function defaultForOmitToPerPage(n: number): OpsPaginationPerPage {
	if (n === 10 || n === 20 || n === 25 || n === 50) return n
	return OPS_PAGINATION_DEFAULT_PER
}
