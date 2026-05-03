/**
 * FE.18.2 — user-visible strings for account top bar (search, profile, notifications).
 */
export const accountTopBarCopy = {
	searchPlaceholder: 'Search bookings, invoices…',
	searchSheetTitle: 'Search',
	searchSubmitButton: 'Search',
	searchPopoverHint:
		'Press Enter to search. Results will appear on the search page when available.',
	profileMenuAria: 'Account menu',
	menuProfile: 'Profile',
	menuSwitchOrganisation: 'Switch organisation',
	menuSignOut: 'Sign out',
	openMobileNavAria: 'Open navigation menu',
	openSearchMobileAria: 'Open search',
	searchAriaLabel: 'Search bookings, invoices',
	brandFallbackName: 'Member',
} as const

export function accountNotificationsAria(count: number): string {
	if (count <= 0) return 'Notifications — no new messages'
	if (count > 99) return 'Notifications — more than 99 unread messages'
	return `Notifications — ${count} unread ${count === 1 ? 'message' : 'messages'}`
}
