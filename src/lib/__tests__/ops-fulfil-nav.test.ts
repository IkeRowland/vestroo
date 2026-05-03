import { describe, expect, it } from 'vitest'

import { opsFulfilAssignBookingHref, opsFulfilQueueHref } from '@/lib/ops-fulfil-nav'
import { OPS_TRIPS_PATH } from '@/lib/ops-trips-url'

const SAMPLE_UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
const MALFORMED = 'nope'

describe('ops-fulfil-nav (14.8)', () => {
	it('opsFulfilQueueHref always sets queue', () => {
		expect(opsFulfilQueueHref('pending')).toBe(`${OPS_TRIPS_PATH}?queue=pending`)
	})

	it('opsFulfilQueueHref adds focusBookingId when UUID-shaped', () => {
		const u = new URL(opsFulfilQueueHref('paid', { focusBookingId: SAMPLE_UUID }), 'https://example.com')
		expect(u.searchParams.get('queue')).toBe('paid')
		expect(u.searchParams.get('bookingId')).toBe(SAMPLE_UUID)
	})

	it('opsFulfilQueueHref ignores non-UUID focus ids', () => {
		const href = opsFulfilQueueHref('paid', { focusBookingId: MALFORMED })
		expect(href).toBe(`${OPS_TRIPS_PATH}?queue=paid`)
		expect(href).not.toContain('bookingId')
	})

	it('opsFulfilAssignBookingHref targets paid queue with booking', () => {
		expect(opsFulfilAssignBookingHref(SAMPLE_UUID)).toBe(
			`${OPS_TRIPS_PATH}?queue=paid&bookingId=${encodeURIComponent(SAMPLE_UUID)}`,
		)
	})
})
