/**
 * FE.17.2 / NFR.17.8 — user-visible strings for ops top bar chrome (search, profile, notifications aria).
 * Keep new copy here rather than inline literals in JSX.
 */
export const opsTopBarCopy = {
	searchPlaceholder: 'Search bookings, clients, vehicles…',
	searchSheetTitle: 'Search',
	recentHeading: 'Recent searches',
	quickJumpHeading: 'Quick jump',
	searchSubmitButton: 'Search',
	searchOpenMobileAria: 'Open search',
	settingsNavAria: 'Settings',
	profileMenuAria: 'Account menu',
	menuSignOut: 'Sign out',
	menuProfile: 'Profile',
	menuSettings: 'Settings',
	profileRoleFallback: 'Staff',
} as const

export function opsUnreadNotificationsAria(count: number): string {
	return `${count} unread notifications`
}
