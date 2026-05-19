import { describe, expect, it } from 'vitest'

import { OPS_BOOKINGS_DEFAULT_HREF, OPS_BOOKINGS_PATH, OPS_BOOKING_ASSIGN_HREF_SUFFIX } from '@/features/ops/ops-bookings-url'
import {
	OPS_BOOKINGS_NEEDS_ATTENTION_HREF,
	OPS_BOOKINGS_READY_TO_ASSIGN_HREF,
} from '@/lib/ops-bookings-queue-query'
import { opsFulfilAssignBookingHref, opsFulfilQueueHref } from '@/lib/ops-fulfil-nav'

const SAMPLE_UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
const MALFORMED = 'nope'

describe('ops-fulfil-nav (14.8)', () => {
	it('opsFulfilQueueHref maps queues to bookings presets', () => {
		expect(opsFulfilQueueHref('pending')).toBe(OPS_BOOKINGS_NEEDS_ATTENTION_HREF)
		expect(opsFulfilQueueHref('trip_request')).toBe(OPS_BOOKINGS_DEFAULT_HREF)
		expect(opsFulfilQueueHref('paid')).toBe(OPS_BOOKINGS_READY_TO_ASSIGN_HREF)
	})

	it('opsFulfilQueueHref uses assign anchor for paid queue + UUID focus booking', () => {
		expect(opsFulfilQueueHref('paid', { focusBookingId: SAMPLE_UUID })).toBe(
			`${OPS_BOOKINGS_PATH}/${encodeURIComponent(SAMPLE_UUID)}${OPS_BOOKING_ASSIGN_HREF_SUFFIX}`,
		)
	})

	it('opsFulfilQueueHref opens booking detail without assign hash for non-paid queues + focus booking', () => {
		expect(opsFulfilQueueHref('pending', { focusBookingId: SAMPLE_UUID })).toBe(
			`${OPS_BOOKINGS_PATH}/${encodeURIComponent(SAMPLE_UUID)}`,
		)
	})

	it('opsFulfilQueueHref ignores non-UUID focus ids', () => {
		const href = opsFulfilQueueHref('paid', { focusBookingId: MALFORMED })
		expect(href).toBe(OPS_BOOKINGS_READY_TO_ASSIGN_HREF)
		expect(href).not.toContain('bookingId')
	})

	it('opsFulfilQueueHref ignores driver focus (assign UI is on booking detail)', () => {
		const href = opsFulfilQueueHref('paid', { focusDriverProfileId: SAMPLE_UUID })
		expect(href).toBe(OPS_BOOKINGS_READY_TO_ASSIGN_HREF)
	})

	it('opsFulfilAssignBookingHref targets booking detail assign anchor', () => {
		expect(opsFulfilAssignBookingHref(SAMPLE_UUID)).toBe(
			`${OPS_BOOKINGS_PATH}/${encodeURIComponent(SAMPLE_UUID)}${OPS_BOOKING_ASSIGN_HREF_SUFFIX}`,
		)
	})
})
