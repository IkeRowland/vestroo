import { describe, it, expect } from 'vitest'

import {
	type OpsBookingQuoteDetailRow,
	pickResolvedBookingQuote,
	quoteStatusAllowsResend,
} from '@/lib/booking-current-quote'

const baseRow = (overrides: Partial<OpsBookingQuoteDetailRow>): OpsBookingQuoteDetailRow => ({
	id: 'a1111111-1111-4111-8111-111111111111',
	booking_id: 'b1111111-1111-4111-8111-111111111111',
	version: 1,
	total_zar: 100,
	line_items: [],
	rendered_html: null,
	pdf_storage_path: null,
	expires_at: null,
	sent_at: null,
	sent_to_email: null,
	status: 'sent',
	created_at: '2026-01-01T00:00:00.000Z',
	...overrides,
})

describe('pickResolvedBookingQuote', () => {
	it('prefers row loaded by current_quote_id when present', () => {
		const byId = baseRow({ id: 'by-id', version: 2 })
		const fromView = baseRow({ id: 'from-view', version: 1 })
		const out = pickResolvedBookingQuote('by-id', byId, fromView)
		expect(out?.id).toBe('by-id')
		expect(out?.version).toBe(2)
	})

	it('falls back to v_booking_current_quote when current_quote_id set but row missing', () => {
		const fromView = baseRow({ id: 'from-view', version: 3 })
		const out = pickResolvedBookingQuote('stale-fk', null, fromView)
		expect(out?.id).toBe('from-view')
	})

	it('uses view when current_quote_id is null', () => {
		const fromView = baseRow({ id: 'from-view' })
		const out = pickResolvedBookingQuote(null, null, fromView)
		expect(out?.id).toBe('from-view')
	})
})

describe('quoteStatusAllowsResend', () => {
	it('is true only for sent and accepted', () => {
		expect(quoteStatusAllowsResend('sent')).toBe(true)
		expect(quoteStatusAllowsResend('accepted')).toBe(true)
		expect(quoteStatusAllowsResend('draft')).toBe(false)
		expect(quoteStatusAllowsResend('expired')).toBe(false)
		expect(quoteStatusAllowsResend('superseded')).toBe(false)
	})
})
