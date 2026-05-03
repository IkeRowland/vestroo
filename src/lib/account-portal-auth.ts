import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import {
	ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE,
	type AccountPortalMembership,
	type AccountPortalMemberSession,
	type ActiveCustomerAccountPortalRow,
	getActiveMembershipRole,
	resolveActiveAccountForPortal,
} from '@/lib/account-portal-auth-shared'
import { createUserServerClient } from '@/lib/supabase/server'
import type { CustomerAccountMemberRoleDb, CustomerAccountRowDb } from '@/types/database.types'

export {
	ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE,
	type AccountPortalMembership,
	type AccountPortalMemberSession,
	type ActiveCustomerAccountPortalRow,
	getActiveAccountCookieOptions,
	getActiveMembershipRole,
	portalRoleLabel,
	resolveActiveAccountForPortal,
} from '@/lib/account-portal-auth-shared'

const PORTAL_MEMBER_ROLES: ReadonlySet<CustomerAccountMemberRoleDb> = new Set([
	'admin',
	'booker',
	'rider',
])

type UserSupabase = Awaited<ReturnType<typeof createUserServerClient>>

/** Links pending invite rows when the user authenticated without reopening the signed invite URL. */
async function tryAcceptPendingInvitesForPortal(supabase: UserSupabase): Promise<void> {
	const { error } = await supabase.rpc('accept_pending_customer_account_invites_for_current_user')
	if (error) {
		console.warn('[vestroo:account-portal] accept_pending_invites_rpc_failed', error.message)
	}
}

async function fetchEligibleMemberships(
	supabase: UserSupabase,
	userId: string,
): Promise<AccountPortalMembership[]> {
	const { data, error } = await supabase
		.from('customer_account_members')
		.select(
			`
			account_id,
			role,
			customer_accounts (
				id,
				name,
				slug
			)
		`,
		)
		.eq('profile_id', userId)
		.not('accepted_at', 'is', null)

	if (error || !data) return []

	const out: AccountPortalMembership[] = []
	for (const row of data) {
		const role = row.role as CustomerAccountMemberRoleDb
		if (!PORTAL_MEMBER_ROLES.has(role)) continue
		const embed = row.customer_accounts as
			| Pick<CustomerAccountRowDb, 'id' | 'name' | 'slug'>
			| Pick<CustomerAccountRowDb, 'id' | 'name' | 'slug'>[]
			| null
		const acc = Array.isArray(embed) ? embed[0] : embed
		if (!acc?.id) continue
		out.push({
			accountId: row.account_id,
			role,
			account: acc,
		})
	}
	return out
}

/** Per-request dedupe when layout + page both load memberships. */
export const loadEligibleMemberships = cache(async (userId: string) => {
	const supabase = await createUserServerClient()
	return fetchEligibleMemberships(supabase, userId)
})

function sanitizeAccountNextParam(raw: string | null): string {
	if (!raw || !raw.startsWith('/account')) return '/account'
	if (raw.startsWith('/account/login') || raw.startsWith('/account/unauthorized')) return '/account'
	return raw
}

/**
 * Logged-out users → null. Logged-in users include memberships (possibly empty).
 * Portal gate (non-empty + accepted invite) is enforced in `requireAccountMemberPage`.
 */
export async function getAccountPortalSession(): Promise<{
	userId: string
	email?: string
	memberships: AccountPortalMembership[]
} | null> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user) return null

	await tryAcceptPendingInvitesForPortal(supabase)
	const memberships = await loadEligibleMemberships(user.id)
	return { userId: user.id, email: user.email ?? undefined, memberships }
}

/**
 * Server layouts/pages under `(account)/account/(portal)/*` only — not `/account/login` or
 * `/account/unauthorized` (those are siblings so they skip the gated layout). Uses `x-pathname`
 * from middleware: **path + query** for **`/account/preferences?category=…` → login** (**15C.6**)
 * (must stay under `/account` when sanitised).
 */
export async function requireAccountMemberPage(): Promise<AccountPortalMemberSession> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()

	if (userErr || !user) {
		const headersList = await headers()
		/** `middleware` sets path + `search` so `?category=` is preserved. */
		const pathname = headersList.get('x-pathname') ?? '/account'
		const next = sanitizeAccountNextParam(pathname)
		redirect(`/account/login?next=${encodeURIComponent(next)}`)
	}

	await tryAcceptPendingInvitesForPortal(supabase)
	const memberships = await loadEligibleMemberships(user.id)
	if (memberships.length === 0) {
		redirect('/account/unauthorized')
	}

	const cookieStore = await cookies()
	const cookieVal = cookieStore.get(ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE)?.value
	const { activeAccountId, activeAccount } = resolveActiveAccountForPortal(memberships, cookieVal)

	// Do not call `cookies().set` here: Server Components / layouts may only read cookies.
	// Single-membership users already ignore the switcher cookie in `resolveActiveAccountForPortal`.
	// Clearing a stale cookie is reserved for Server Actions (e.g. after account removal UX).

	return {
		userId: user.id,
		email: user.email ?? undefined,
		memberships,
		activeAccountId,
		activeAccount,
	}
}

/**
 * Like `requireAccountMemberPage`, but redirects to `/account` when the active membership
 * role is not in `allowed` (stub routes for admin-only / booker+admin surfaces).
 */
export async function requireAccountPortalRoles(
	allowed: ReadonlySet<CustomerAccountMemberRoleDb>,
): Promise<AccountPortalMemberSession> {
	const session = await requireAccountMemberPage()
	const role = getActiveMembershipRole(session)
	if (!role || !allowed.has(role)) {
		redirect('/account')
	}
	return session
}

/**
 * Active account row for dashboard copy (RLS: member can read their account only).
 * Returns null if the row is missing — caller should fall back to `session.activeAccount`.
 */
export const loadActiveCustomerAccountForPortal = cache(async (activeAccountId: string) => {
	const supabase = await createUserServerClient()
	const { data, error } = await supabase
		.from('customer_accounts')
		.select('id, name, slug, default_billing_entity_ref, default_po_required, credit_terms_days')
		.eq('id', activeAccountId)
		.maybeSingle()

	if (error || !data) return null
	return data as ActiveCustomerAccountPortalRow
})
