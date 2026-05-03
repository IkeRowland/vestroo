import type { CustomerAccountMemberRoleDb, CustomerAccountRowDb } from '@/types/database.types'

/** httpOnly active-account selection for `/account/*` (set via server action). */
export const ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE = 'vestroo_active_account_id'

export type AccountPortalMembership = {
	accountId: string
	role: CustomerAccountMemberRoleDb
	account: Pick<CustomerAccountRowDb, 'id' | 'name' | 'slug'>
}

export type AccountPortalMemberSession = {
	userId: string
	email?: string
	memberships: AccountPortalMembership[]
	activeAccountId: string
	activeAccount: Pick<CustomerAccountRowDb, 'id' | 'name' | 'slug'>
}

export function getActiveAccountCookieOptions(): {
	httpOnly: boolean
	secure: boolean
	sameSite: 'lax'
	path: string
	maxAge: number
} {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/account',
		maxAge: 60 * 60 * 24 * 400,
	}
}

/**
 * Default active account when cookie is missing or invalid: stable sort by
 * `customer_accounts.name` ascending, then `customer_accounts.id` ascending.
 */
function sortMembershipsStable(memberships: AccountPortalMembership[]): AccountPortalMembership[] {
	return [...memberships].sort((a, b) => {
		const byName = a.account.name.localeCompare(b.account.name)
		if (byName !== 0) return byName
		return a.account.id.localeCompare(b.account.id)
	})
}

/** Exported for server actions that must not call `requireAccountMemberPage` (which may `redirect`). */
export function resolveActiveAccountForPortal(
	memberships: AccountPortalMembership[],
	cookieAccountId: string | undefined,
): { activeAccountId: string; activeAccount: Pick<CustomerAccountRowDb, 'id' | 'name' | 'slug'> } {
	const sorted = sortMembershipsStable(memberships)
	const first = sorted[0]
	if (!first) {
		throw new Error('resolveActiveAccountForPortal: empty memberships')
	}

	if (sorted.length === 1) {
		return { activeAccountId: first.accountId, activeAccount: first.account }
	}

	const idSet = new Set(sorted.map((m) => m.accountId))
	if (cookieAccountId && idSet.has(cookieAccountId)) {
		const picked = sorted.find((m) => m.accountId === cookieAccountId) ?? first
		return { activeAccountId: picked.accountId, activeAccount: picked.account }
	}

	return { activeAccountId: first.accountId, activeAccount: first.account }
}

/** Human-readable label for `customer_account_members.role` on the dashboard. */
export function portalRoleLabel(role: CustomerAccountMemberRoleDb): string {
	switch (role) {
		case 'admin':
			return 'Admin'
		case 'booker':
			return 'Booker'
		case 'rider':
			return 'Rider'
	}
}

export function getActiveMembershipRole(
	session: AccountPortalMemberSession,
): CustomerAccountMemberRoleDb | null {
	const m = session.memberships.find((x) => x.accountId === session.activeAccountId)
	return m?.role ?? null
}

export type ActiveCustomerAccountPortalRow = Pick<
	CustomerAccountRowDb,
	'id' | 'name' | 'slug' | 'default_billing_entity_ref' | 'default_po_required' | 'credit_terms_days'
>
