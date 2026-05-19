import { accountDashboardCopy } from '@/features/account/copy/account-dashboard-copy'
import type { OpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { formatQueueStatusLabel } from '@/lib/account-bookings-list-query'

export type AccountDashboardRailPill = {
	tone: OpsStatusPillTone
	label: string
}

/**
 * Maps a booking pipeline **`status`** to a customer-facing rail chip (**FE.18.3**).
 */
export function accountDashboardRailStatusPill(status: string | null): AccountDashboardRailPill {
	const s = (status ?? '').trim()
	if (s === 'pending_confirmation') {
		return { tone: 'warning', label: accountDashboardCopy.railStatusPendingConfirmation }
	}
	if (['quote_sent', 'triaged', 'submitted', 'pending'].includes(s)) {
		return { tone: 'warning', label: accountDashboardCopy.railStatusPendingQuote }
	}
	if (['paid', 'quote_accepted', 'awaiting_payment'].includes(s)) {
		return { tone: 'success', label: accountDashboardCopy.railStatusConfirmed }
	}
	if (['assigned', 'in_progress', 'ready_to_assign'].includes(s)) {
		return { tone: 'info', label: accountDashboardCopy.railStatusDriverAssigned }
	}
	return { tone: 'neutral', label: s ? formatQueueStatusLabel(s) : '—' }
}
