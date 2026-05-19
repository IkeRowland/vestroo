import { describe, expect, it } from 'vitest'

import {
	getBookingsQueuePaymentPillTone,
	getBookingsQueueStatusPillTone,
} from '@/features/ops/lib/ops-bookings-queue-pill-tones'

describe('ops-bookings-queue-pill-tones (17.10)', () => {
	it('maps booking lifecycle statuses', () => {
		expect(getBookingsQueueStatusPillTone('ready_to_assign')).toBe('warning')
		expect(getBookingsQueueStatusPillTone('cancelled')).toBe('danger')
		expect(getBookingsQueueStatusPillTone('completed')).toBe('success')
		expect(getBookingsQueueStatusPillTone('pending_confirmation')).toBe('warning')
	})

	it('maps payment_status separately from booking status', () => {
		expect(getBookingsQueuePaymentPillTone('pending')).toBe('warning')
		expect(getBookingsQueueStatusPillTone('pending')).toBe('neutral')
	})
})
