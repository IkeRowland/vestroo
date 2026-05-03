import { describe, it, expect } from 'vitest'

import { getAccountPrefsDeepLinkCategory, getCommsEventCommsCategory } from '@/lib/comms/comms-event-category'

describe('comms-event-category (15C.6)', () => {
	it('maps matrix quote events to informational (preference toggles)', () => {
		expect(getCommsEventCommsCategory('quote_sent_account')).toBe('informational')
		expect(getCommsEventCommsCategory('quote_sent_walk_in')).toBe('informational')
		expect(getAccountPrefsDeepLinkCategory('quote_sent_account')).toBe('informational')
	})

	it('maps payment and leg trips to transactional (bypass in matrix dispatch; no list-unsub in tests)', () => {
		expect(getCommsEventCommsCategory('payment_received')).toBe('transactional')
		expect(getAccountPrefsDeepLinkCategory('payment_received')).toBeNull()
		expect(getCommsEventCommsCategory('member_invited')).toBe('transactional')
	})

	it('includes trip and booking lifecycle in transactional', () => {
		expect(getCommsEventCommsCategory('booking_submitted')).toBe('transactional')
		expect(getCommsEventCommsCategory('trip_en_route')).toBe('transactional')
	})

	/** 15.26 (15C.8) — `invoice_due_reminder` is transactional: matrix dispatch is not subject to marketing opt-out. */
	it('classifies scheduled invoice_due_reminder as transactional (§6 bypass)', () => {
		expect(getCommsEventCommsCategory('invoice_due_reminder')).toBe('transactional')
		expect(getAccountPrefsDeepLinkCategory('invoice_due_reminder')).toBeNull()
	})
})
