import { describe, expect, it } from 'vitest'

import { accountBookingsCopy } from '@/features/account/copy/account-bookings-copy'
import { accountDashboardCopy } from '@/features/account/copy/account-dashboard-copy'
import { accountBookingsTableStatusPill } from '@/lib/account-bookings-table-status'
import { accountDashboardRailStatusPill } from '@/lib/account-dashboard-rail-status'

describe('account portal booking status labels', () => {
	it('bookings list + rail: pending_confirmation → Pending Confirmation', () => {
		const pill = accountBookingsTableStatusPill('pending_confirmation')
		expect(pill.label).toBe(accountBookingsCopy.listStatusPendingConfirmation)
		expect(pill.tone).toBe('warning')
	})

	it('bookings list + rail: assigned → Booking Confirmed', () => {
		const pill = accountBookingsTableStatusPill('assigned')
		expect(pill.label).toBe(accountBookingsCopy.listStatusBookingConfirmed)
	})

	it('dashboard upcoming card: pending_confirmation matches bookings wording', () => {
		const pill = accountDashboardRailStatusPill('pending_confirmation')
		expect(pill.label).toBe(accountDashboardCopy.railStatusPendingConfirmation)
		expect(pill.tone).toBe('warning')
	})
})
