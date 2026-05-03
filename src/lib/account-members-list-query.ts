/**
 * `/account/members` URL state — **Story 18.7** / **FE.18.6** (namespaced pagination + search).
 */

import type { OpsPaginationPerPage } from '@/features/ops/lib/ops-pagination-url'

export const ACCOUNT_MEMBERS_LIST_PAGE_SIZE = 25

export const ACCOUNT_MEMBERS_LIST_MAX_PAGE = 200

export const ACCT_MEMBERS_PARAM = {
	page: 'acct_page',
	per: 'acct_per',
	q: 'acct_q',
} as const

export type AccountMembersListParsed = {
	page: number
	perPage: number
	search: string
}

const SEARCH_MAX = 200

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
	const v = allParamValues(raw, ACCT_MEMBERS_PARAM.page)[0]
	const n = v ? Number.parseInt(v, 10) : 1
	if (!Number.isFinite(n) || n < 1) return 1
	return Math.min(n, ACCOUNT_MEMBERS_LIST_MAX_PAGE)
}

function parsePer(raw: Record<string, string | string[] | undefined>): number {
	const v = allParamValues(raw, ACCT_MEMBERS_PARAM.per)[0]
	const n = v ? Number.parseInt(v, 10) : ACCOUNT_MEMBERS_LIST_PAGE_SIZE
	if (!Number.isFinite(n) || n < 1) return ACCOUNT_MEMBERS_LIST_PAGE_SIZE
	const allowed: OpsPaginationPerPage[] = [10, 20, 25, 50]
	if (allowed.includes(n as OpsPaginationPerPage)) {
		return n as OpsPaginationPerPage
	}
	return ACCOUNT_MEMBERS_LIST_PAGE_SIZE
}

function parseSearch(raw: Record<string, string | string[] | undefined>): string {
	const s = (allParamValues(raw, ACCT_MEMBERS_PARAM.q)[0] ?? '').trim()
	if (s.length > SEARCH_MAX) {
		return s.slice(0, SEARCH_MAX)
	}
	return s
}

export function parseAccountMembersListSearchParams(
	raw: Record<string, string | string[] | undefined>,
): AccountMembersListParsed {
	return {
		page: parsePage(raw),
		perPage: parsePer(raw),
		search: parseSearch(raw),
	}
}

export function serializeAccountMembersListSearchParams(p: AccountMembersListParsed): string {
	const u = new URLSearchParams()
	if (p.page > 1) u.set(ACCT_MEMBERS_PARAM.page, String(p.page))
	if (p.perPage !== ACCOUNT_MEMBERS_LIST_PAGE_SIZE) u.set(ACCT_MEMBERS_PARAM.per, String(p.perPage))
	if (p.search.length > 0) u.set(ACCT_MEMBERS_PARAM.q, p.search)
	return u.toString()
}

export function accountMembersListPathWithQuery(p: AccountMembersListParsed): string {
	const qs = serializeAccountMembersListSearchParams(p)
	return qs.length > 0 ? `/account/members?${qs}` : '/account/members'
}

export function accountMembersListHref(
	current: AccountMembersListParsed,
	overrides: Partial<AccountMembersListParsed>,
): string {
	const next: AccountMembersListParsed = {
		page: overrides.page !== undefined ? overrides.page : current.page,
		perPage: overrides.perPage !== undefined ? overrides.perPage : current.perPage,
		search: overrides.search !== undefined ? overrides.search : current.search,
	}
	return accountMembersListPathWithQuery(next)
}

/** Base query string for shared **`Pagination`** (omits **`acct_page`**; merge page via `buildOpsPaginationHref`). */
export function accountMembersListSearchExcludingPage(p: AccountMembersListParsed): string {
	const u = new URLSearchParams(serializeAccountMembersListSearchParams(p))
	u.delete(ACCT_MEMBERS_PARAM.page)
	return u.toString()
}
