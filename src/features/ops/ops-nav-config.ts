import type { LucideIcon } from 'lucide-react'
import {
	Calendar,
	Car,
	ClipboardList,
	Landmark,
	LayoutDashboard,
	Mail,
	Receipt,
	Sparkles,
	Truck,
	Users,
} from 'lucide-react'

import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import { isOpsDispatchBoardNavEnabled } from '@/lib/ops-dispatch-board-nav-env'
import type { ProfileRole } from '@/types/database.types'

/**
 * TEMP: Sidebar link for **Experiences**. Set `true` to show **`/ops/experiences`** under Configuration.
 */
export const OPS_NAV_SHOW_EXPERIENCES = false

/** Roles that may use the ops console shell (see `requireOpsStaffPage`). */
export const OPS_CONSOLE_ROLES: readonly ProfileRole[] = ['dispatcher', 'admin']

/**
 * Roles that see **dispatch board** nav when enabled (`NEXT_PUBLIC_OPS_DISPATCH_BOARD_NAV_ENABLED`).
 *
 * **Theme H / FE.5.1 forward-compat:** When a finance-first (or other) **`ProfileRole`** is added for
 * ops staff who only reconcile, **do not** add that role here — they keep **Bookings**, **Invoicing**,
 * and **Bank account** via the default `visibleRoles` fallback on those items. Documented in Story **16.22**.
 */
export const OPS_PRIMARY_WORKFLOW_QUEUE_ROLES: readonly ProfileRole[] = [
	'dispatcher',
	'admin',
]

export type OpsNavGroupId = 'fulfilment' | 'finance' | 'configuration'

export type OpsNavItem = {
	href: string
	label: string
	icon: LucideIcon
	/** If omitted, item is shown to all ops staff (`dispatcher` and `admin`). */
	visibleRoles?: readonly ProfileRole[]
	/**
	 * Optional count badge (FE.17.3). Prefer **`navBadgeCounts`** from shell keyed by **`href`**
	 * for dynamic counts; this field supports static defaults in config when needed.
	 */
	badgeCount?: number | null
}

export type OpsNavGroup = {
	id: OpsNavGroupId
	title: string
	items: readonly OpsNavItem[]
	/**
	 * Secondary **legacy** shortcuts (Theme A / **US-A3**): smaller typography + **Legacy** pill in
	 * **`OpsSidebar`** — bookmarks stay reachable without competing with workflow-primary IA.
	 */
	legacyItems?: readonly OpsNavItem[]
}

function buildFulfilmentGroup(): OpsNavGroup {
	const primaryItems: OpsNavItem[] = [{ href: '/ops', label: 'Dashboard', icon: LayoutDashboard }]

	if (isOpsDispatchBoardNavEnabled()) {
		primaryItems.push({
			href: '/ops/dispatch',
			label: 'Dispatch',
			icon: Calendar,
			visibleRoles: OPS_PRIMARY_WORKFLOW_QUEUE_ROLES,
		})
	}

	primaryItems.push(
		{ href: OPS_BOOKINGS_PATH, label: 'Bookings', icon: ClipboardList },
		{ href: '/ops/calendar', label: 'Calendar', icon: Calendar },
		{
			href: '/ops/bookings/comms-retry',
			label: 'Comms retry',
			icon: Mail,
		},
		{ href: '/ops/trips', label: 'Trips', icon: Car },
		{ href: '/ops/clients', label: 'Clients', icon: Users },
		{ href: '/ops/fleet/drivers', label: 'Fleet', icon: Truck },
	)

	return {
		id: 'fulfilment',
		title: 'Fulfilment',
		items: primaryItems,
	}
}

/**
 * Domain-grouped navigation for `/ops/*` (FE.5.1). Labels follow VST / ops-console wording.
 *
 * **FE.5.11 (Story 5.11 + 16.22) audit:** Sidebar groups cover **fulfilment & bookings** (including **Clients**,
 * **Fleet** at **`/ops/fleet/drivers`** (index **`/ops/fleet`** redirects to Drivers), and the **`/ops/bookings`** unified queue — **Q20**), **finance**, and optionally **configuration**
 * (**`/ops/experiences`**) when **`OPS_NAV_SHOW_EXPERIENCES`**.
 * **`/ops/dispatch`** (Theme C dispatch board) is **nav-gated** via
 * **`NEXT_PUBLIC_OPS_DISPATCH_BOARD_NAV_ENABLED`** until the route ships — see **`docs/ops-console.md`**
 * § FE.5.11 and **`docs/capstone-backend-module-matrix.md`** § FE.5.11 / BE.6.7. Routes without nav yet
 * (**`/ops/users`**, service-area authoring) remain **deferred**.
 */
export const OPS_NAV_GROUPS: readonly OpsNavGroup[] = [
	buildFulfilmentGroup(),
	{
		id: 'finance',
		title: 'Finance',
		items: [
			{ href: '/ops/invoicing', label: 'Invoicing', icon: Receipt },
			{
				href: '/ops/settings/bank-account',
				label: 'Bank account (EFT)',
				icon: Landmark,
				visibleRoles: ['admin'],
			},
		],
	},
	...(OPS_NAV_SHOW_EXPERIENCES
		? [
				{
					id: 'configuration' as const,
					title: 'Configuration',
					items: [{ href: '/ops/experiences', label: 'Experiences', icon: Sparkles }],
				} satisfies OpsNavGroup,
			]
		: []),
]

const SEGMENT_LABELS: Record<string, string> = {
	dashboard: 'Dashboard',
	board: 'Board',
	calendar: 'Calendar',
	fulfil: 'Fulfil',
	bookings: 'Bookings',
	'comms-retry': 'Comms retry',
	assign: 'Assign trip',
	trips: 'Trips',
	search: 'Booking search',
	fleet: 'Fleet',
	categories: 'Categories',
	vehicles: 'Vehicles',
	clients: 'Clients',
	invoicing: 'Invoicing',
	'bank-account': 'Bank account',
	compliance: 'Compliance',
	comms: 'Comms registry',
	reports: 'Reports',
	suggestions: 'Suggestions',
	experiences: 'Experiences',
	// Epic 16 / US-A3 — breadcrumb labels for workflow + future ops paths
	'walk-in': 'Walk-in bookings',
	accounts: 'Account bookings',
	dispatch: 'Dispatch',
	drivers: 'Drivers',
	live: 'Live tracking',
	alerts: 'Alerts',
	'service-areas': 'Service areas',
	admin: 'Admin',
	roles: 'Roles & permissions',
	settings: 'Settings',
	'service-runs': 'Shuttle departures',
}

export function isOpsNavItemVisible(
	item: OpsNavItem,
	role: ProfileRole,
): boolean {
	const allowed = item.visibleRoles ?? OPS_CONSOLE_ROLES
	return allowed.includes(role)
}

export function filterOpsNavGroups(
	groups: readonly OpsNavGroup[],
	role: ProfileRole,
): OpsNavGroup[] {
	return groups
		.map((g) => {
			const items = g.items.filter((item) => isOpsNavItemVisible(item, role))
			const legacyFiltered = g.legacyItems?.filter((item) =>
				isOpsNavItemVisible(item, role),
			)
			const legacyItems =
				legacyFiltered && legacyFiltered.length > 0 ? legacyFiltered : undefined
			return { ...g, items, legacyItems }
		})
		.filter((g) => g.items.length > 0 || (g.legacyItems && g.legacyItems.length > 0))
}

/** Breadcrumb trail for authenticated ops routes (`/ops/...`). */
export function getOpsBreadcrumbs(pathname: string): { href: string; label: string }[] {
	const segments = pathname.split('/').filter(Boolean)
	if (segments[0] !== 'ops') {
		return []
	}

	const tail = segments.slice(1)
	const crumbs: { href: string; label: string }[] = [
		{ href: '/ops', label: 'Operations' },
	]

	let path = '/ops'
	for (let i = 0; i < tail.length; i++) {
		const seg = tail[i]!
		path += `/${seg}`
		const label = SEGMENT_LABELS[seg] ?? humanizeSegment(seg)
		crumbs.push({ href: path, label })
	}

	return crumbs
}

function humanizeSegment(seg: string): string {
	if (/^[0-9a-f-]{8,}$/i.test(seg)) {
		return 'Detail'
	}
	return seg
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ')
}
