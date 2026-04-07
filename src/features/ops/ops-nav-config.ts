import type { LucideIcon } from 'lucide-react'
import {
	Calendar,
	Car,
	LayoutGrid,
	MapPin,
	Package,
	Receipt,
	Search,
	Shield,
	Sparkles,
	Truck,
	Users,
} from 'lucide-react'

import type { ProfileRole } from '@/types/database.types'

/** Roles that may use the ops console shell (see `requireOpsStaffPage`). */
export const OPS_CONSOLE_ROLES: readonly ProfileRole[] = ['dispatcher', 'admin']

export type OpsNavGroupId =
	| 'fulfilment'
	| 'fleet'
	| 'people'
	| 'finance'
	| 'product'

export type OpsNavItem = {
	href: string
	label: string
	icon: LucideIcon
	/** If omitted, item is shown to all ops staff (`dispatcher` and `admin`). */
	visibleRoles?: readonly ProfileRole[]
}

export type OpsNavGroup = {
	id: OpsNavGroupId
	title: string
	items: readonly OpsNavItem[]
}

/**
 * Domain-grouped navigation for `/ops/*` (FE.5.1). Labels follow VST / ops-console wording.
 */
export const OPS_NAV_GROUPS: readonly OpsNavGroup[] = [
	{
		id: 'fulfilment',
		title: 'Fulfilment',
		items: [
			{ href: '/ops/board', label: 'Board', icon: LayoutGrid },
			{ href: '/ops/calendar', label: 'Calendar', icon: Calendar },
			{ href: '/ops/fulfil', label: 'Fulfil', icon: Package },
			{ href: '/ops/trips', label: 'Trips', icon: Car },
			{
				href: '/ops/search',
				label: 'Staff booking search',
				icon: Search,
			},
		],
	},
	{
		id: 'fleet',
		title: 'Fleet',
		items: [{ href: '/ops/vehicles', label: 'Vehicles', icon: Truck }],
	},
	{
		id: 'people',
		title: 'People',
		items: [{ href: '/ops/roster', label: 'Roster', icon: Users }],
	},
	{
		id: 'finance',
		title: 'Finance & compliance',
		items: [
			{ href: '/ops/invoicing', label: 'Invoicing', icon: Receipt },
			{ href: '/ops/compliance', label: 'Compliance', icon: Shield },
		],
	},
	{
		id: 'product',
		title: 'Engagements',
		items: [
			{ href: '/ops/experiences', label: 'Experiences', icon: Sparkles },
			{
				href: '/ops/close-protection',
				label: 'Close protection',
				icon: MapPin,
			},
		],
	},
]

const SEGMENT_LABELS: Record<string, string> = {
	board: 'Board',
	calendar: 'Calendar',
	fulfil: 'Fulfil',
	trips: 'Trips',
	search: 'Staff booking search',
	vehicles: 'Vehicles',
	roster: 'Roster',
	invoicing: 'Invoicing',
	compliance: 'Compliance',
	experiences: 'Experiences',
	'close-protection': 'Close protection',
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
		.map((g) => ({
			...g,
			items: g.items.filter((item) => isOpsNavItemVisible(item, role)),
		}))
		.filter((g) => g.items.length > 0)
}

/** Breadcrumb trail for authenticated ops routes (`/ops/...`). */
export function getOpsBreadcrumbs(pathname: string): { href: string; label: string }[] {
	const segments = pathname.split('/').filter(Boolean)
	if (segments[0] !== 'ops') {
		return []
	}

	const tail = segments.slice(1)
	const crumbs: { href: string; label: string }[] = [
		{ href: '/ops/board', label: 'Operations' },
	]

	let path = '/ops'
	for (let i = 0; i < tail.length; i++) {
		const seg = tail[i]!
		path += `/${seg}`
		const prev = tail[i - 1]
		const label =
			SEGMENT_LABELS[seg] ??
			(prev === 'close-protection' ? 'Engagement' : humanizeSegment(seg))
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
