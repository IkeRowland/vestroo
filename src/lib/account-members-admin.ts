import type { SupabaseClient } from '@supabase/supabase-js'

import { escapeIlikePattern } from '@/lib/ops-booking-grid-query'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

export type AccountMemberRow = {
	account_id: string
	email: string
	profile_id: string | null
	full_name: string | null
	role: CustomerAccountMemberRoleDb
	invited_at: string
	accepted_at: string | null
	/** Epic 15 / 15A.6 — last successful outbound invite email (or skipped test mode). */
	invite_email_last_sent_at: string | null
}

const MEMBER_LIST_SELECT =
	'account_id, email, profile_id, full_name, role, invited_at, accepted_at, invite_email_last_sent_at'

export type LoadAccountMemberRowsPageOptions = {
	/** Trims; empty = no filter. */
	search: string
	page: number
	perPage: number
}

/**
 * Most recent activity timestamp available on the membership row (no cross-table reads).
 * Used for the “Last active” column on `/account/members`.
 */
export function memberRowLastActivityIso(row: AccountMemberRow): string {
	const candidates = [row.invited_at, row.accepted_at, row.invite_email_last_sent_at].filter(
		(s): s is string => typeof s === 'string' && s.length > 0,
	)
	let best = row.invited_at
	for (const c of candidates) {
		if (new Date(c) > new Date(best)) best = c
	}
	return best
}

function applyMemberListOrder<T extends { order: (c: string, o: { ascending: boolean; nullsFirst?: boolean }) => T }>(
	q: T,
): T {
	return q
		.order('accepted_at', { ascending: false, nullsFirst: false })
		.order('email', { ascending: true })
}

export async function loadAccountMemberRows(
	supabase: SupabaseClient,
	activeAccountId: string,
	options?: LoadAccountMemberRowsPageOptions,
): Promise<{ rows: AccountMemberRow[]; total: number; currentPage: number; error: string | null }> {
	if (!options) {
		const { data, error } = await applyMemberListOrder(
			supabase
				.from('customer_account_members')
				.select(MEMBER_LIST_SELECT)
				.eq('account_id', activeAccountId),
		)

		if (error) {
			return { rows: [], total: 0, currentPage: 1, error: error.message }
		}
		const rows = (data ?? []) as AccountMemberRow[]
		return { rows, total: rows.length, currentPage: 1, error: null }
	}

	const search = options.search.trim()
	const perPage = options.perPage
	let page = Math.max(1, options.page)

	const buildFiltered = () => {
		let q = supabase
			.from('customer_account_members')
			.select(MEMBER_LIST_SELECT, { count: 'exact' })
			.eq('account_id', activeAccountId)
		if (search.length > 0) {
			const esc = escapeIlikePattern(search)
			q = q.or(`email.ilike.%${esc}%,full_name.ilike.%${esc}%`)
		}
		return applyMemberListOrder(q)
	}

	let from = (page - 1) * perPage
	let res = await buildFiltered().range(from, from + perPage - 1)

	if (res.error) {
		return { rows: [], total: 0, currentPage: 1, error: res.error.message }
	}

	const total = res.count ?? 0
	const totalPages = Math.max(1, Math.ceil(total / perPage))
	const safePage = Math.min(page, totalPages)
	if (safePage !== page) {
		page = safePage
		from = (page - 1) * perPage
		res = await buildFiltered().range(from, from + perPage - 1)
		if (res.error) {
			return { rows: [], total: 0, currentPage: 1, error: res.error.message }
		}
	}

	return {
		rows: (res.data ?? []) as AccountMemberRow[],
		total,
		currentPage: page,
		error: null,
	}
}

export async function countAcceptedAdmins(
	supabase: SupabaseClient,
	accountId: string,
): Promise<number> {
	const { count, error } = await supabase
		.from('customer_account_members')
		.select('email', { count: 'exact', head: true })
		.eq('account_id', accountId)
		.eq('role', 'admin')
		.not('accepted_at', 'is', null)

	if (error || count === null) return 0
	return count
}

export function isAcceptedAdminRow(row: Pick<AccountMemberRow, 'role' | 'accepted_at'>): boolean {
	return row.role === 'admin' && row.accepted_at !== null
}

export function lastAdminBlockedMessage(): string {
	return 'This account must keep at least one accepted admin. Add or promote another admin first.'
}
