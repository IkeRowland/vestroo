import { accountBookingsCopy } from '@/features/account/copy/account-bookings-copy'
import type { AccountDashboardRailPill } from '@/lib/account-dashboard-rail-status'
import { accountDashboardRailStatusPill } from '@/lib/account-dashboard-rail-status'

/**
 * Status chip for **`/account/bookings`** table + detail rail (portal-specific labels).
 */
export function accountBookingsTableStatusPill(status: string | null): AccountDashboardRailPill {
	const s = (status ?? '').trim()
	if (s === 'pending_confirmation') {
		return { tone: 'warning', label: accountBookingsCopy.listStatusPendingConfirmation }
	}
	if (s === 'assigned' || s === 'in_progress') {
		return { tone: 'info', label: accountBookingsCopy.listStatusBookingConfirmed }
	}
	return accountDashboardRailStatusPill(status)
}
