import type { LucideIcon } from 'lucide-react'
import {
	CreditCard,
	HelpCircle,
	LayoutDashboard,
	ListChecks,
	Route,
	Settings2,
	Users,
} from 'lucide-react'

import { accountSidebarCopy } from '@/features/account/copy/account-sidebar-copy'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

export type AccountNavGroupId = 'activity' | 'billing' | 'organisation' | 'help'

export type AccountNavItem = {
	href: string
	label: string
	icon: LucideIcon
	/** When true, item is shown only to admins */
	adminOnly?: boolean
}

export type AccountNavGroup = {
	id: AccountNavGroupId
	title: string
	items: readonly AccountNavItem[]
}

export const ACCOUNT_BOOKINGS_TRIPS_HREF = '/account/bookings?view=trips' as const

const ACTIVITY: AccountNavGroup = {
	id: 'activity',
	title: accountSidebarCopy.groupActivity,
	items: [
		{ href: '/account', label: accountSidebarCopy.itemDashboard, icon: LayoutDashboard },
		{ href: '/account/bookings', label: accountSidebarCopy.itemBookings, icon: ListChecks },
		{ href: ACCOUNT_BOOKINGS_TRIPS_HREF, label: accountSidebarCopy.itemTrips, icon: Route },
	],
}

const BILLING: AccountNavGroup = {
	id: 'billing',
	title: accountSidebarCopy.groupBilling,
	items: [
		{
			href: '/account/invoices',
			label: accountSidebarCopy.itemInvoices,
			icon: CreditCard,
			adminOnly: true,
		},
	],
}

const ORGANISATION: AccountNavGroup = {
	id: 'organisation',
	title: accountSidebarCopy.groupOrganisation,
	items: [
		{
			href: '/account/members',
			label: accountSidebarCopy.itemMembers,
			icon: Users,
			adminOnly: true,
		},
		{ href: '/account/preferences', label: accountSidebarCopy.itemPreferences, icon: Settings2 },
	],
}

const HELP: AccountNavGroup = {
	id: 'help',
	title: accountSidebarCopy.groupHelp,
	items: [{ href: '/account/help', label: accountSidebarCopy.itemHelp, icon: HelpCircle }],
}

export const ACCOUNT_NAV_GROUPS: readonly AccountNavGroup[] = [
	ACTIVITY,
	BILLING,
	ORGANISATION,
	HELP,
]

function filterItems(
	items: readonly AccountNavItem[],
	role: CustomerAccountMemberRoleDb,
): AccountNavItem[] {
	const isAdmin = role === 'admin'
	return items.filter((item) => !item.adminOnly || isAdmin)
}

/** Groups with at least one visible item after role filtering. */
export function filterAccountNavGroups(
	role: CustomerAccountMemberRoleDb,
): AccountNavGroup[] {
	return ACCOUNT_NAV_GROUPS.map((g) => ({
		...g,
		items: filterItems(g.items, role),
	}))
		.filter((g) => g.items.length > 0)
}
