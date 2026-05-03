import { describe, expect, it } from 'vitest'

import {
	ACCOUNT_MEMBERS_LIST_PAGE_SIZE,
	accountMembersListHref,
	accountMembersListSearchExcludingPage,
	parseAccountMembersListSearchParams,
	serializeAccountMembersListSearchParams,
} from '@/lib/account-members-list-query'

describe('parseAccountMembersListSearchParams', () => {
	it('defaults page 1, per 25, empty search', () => {
		expect(parseAccountMembersListSearchParams({})).toEqual({
			page: 1,
			perPage: ACCOUNT_MEMBERS_LIST_PAGE_SIZE,
			search: '',
		})
	})

	it('parses acct_q, acct_page, acct_per', () => {
		expect(
			parseAccountMembersListSearchParams({
				acct_q: '  jane@x.com  ',
				acct_page: '2',
				acct_per: '10',
			}),
		).toEqual({
			page: 2,
			perPage: 10,
			search: 'jane@x.com',
		})
	})

	it('ignores invalid per (falls back to default)', () => {
		expect(parseAccountMembersListSearchParams({ acct_per: '99' }).perPage).toBe(ACCOUNT_MEMBERS_LIST_PAGE_SIZE)
	})

	it('round-trips serialize and parse', () => {
		const p = parseAccountMembersListSearchParams({
			acct_q: 'acme',
			acct_page: '3',
			acct_per: '50',
		})
		const qs = serializeAccountMembersListSearchParams(p)
		const again = parseAccountMembersListSearchParams(Object.fromEntries(new URLSearchParams(qs)))
		expect(again).toEqual(p)
	})
})

describe('accountMembersListHref / accountMembersListSearchExcludingPage', () => {
	it('merges search override and resets page', () => {
		const p = parseAccountMembersListSearchParams({ acct_q: 'a', acct_page: '4' })
		const href = accountMembersListHref(p, { search: '', page: 1 })
		expect(href).toBe('/account/members')
	})

	it('excludes acct_page from string for pagination', () => {
		const p = parseAccountMembersListSearchParams({ acct_q: 'test', acct_per: '10' })
		const q = accountMembersListSearchExcludingPage(p)
		expect(q).toContain('acct_q=test')
		expect(q).toContain('acct_per=10')
		expect(q).not.toMatch(/(^|&)acct_page=/)
	})
})
