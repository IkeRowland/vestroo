import { describe, expect, it } from 'vitest'

import { OPS_BOOKINGS_DEFAULT_HREF, OPS_BOOKINGS_PATH, OPS_BOOKING_ASSIGN_HREF_SUFFIX } from '@/features/ops/ops-bookings-url'
import {
	OPS_BOOKINGS_NEEDS_ATTENTION_HREF,
	OPS_BOOKINGS_READY_TO_ASSIGN_HREF,
} from '@/lib/ops-bookings-queue-query'
import {
	buildOpsFulfilLegacyRedirectToBookingsUrl,
	isOpsFulfilAssignPanelDeepLink,
} from '@/lib/ops-fulfil-legacy-redirect'

const SAMPLE_UUID = 'a1111111-1111-4111-8111-111111111111'

describe('buildOpsFulfilLegacyRedirectToBookingsUrl', () => {
	it('maps default, paid, and unknown queues to ready-to-assign bookings view', () => {
		const want = new URL(OPS_BOOKINGS_READY_TO_ASSIGN_HREF, 'https://example.com')
		for (const path of [
			'https://example.com/ops/fulfil',
			'https://example.com/ops/fulfil?queue=paid',
			'https://example.com/ops/fulfil?queue=unknown',
		] as const) {
			const out = buildOpsFulfilLegacyRedirectToBookingsUrl(new URL(path))
			expect(out.origin).toBe('https://example.com')
			expect(out.pathname).toBe(want.pathname)
			expect(out.search).toBe(want.search)
		}
	})

	it('maps trip_request (and trip-request) queue', () => {
		for (const q of ['trip_request', 'trip-request'] as const) {
			const out = buildOpsFulfilLegacyRedirectToBookingsUrl(
				new URL(`https://example.com/ops/fulfil?queue=${q}`),
			)
			const want = new URL(OPS_BOOKINGS_DEFAULT_HREF, 'https://example.com')
			expect(out.pathname).toBe(want.pathname)
			expect(out.search).toBe(want.search)
		}
	})

	it('maps pending queue', () => {
		const out = buildOpsFulfilLegacyRedirectToBookingsUrl(
			new URL('https://example.com/ops/fulfil?queue=pending'),
		)
		const want = new URL(OPS_BOOKINGS_NEEDS_ATTENTION_HREF, 'https://example.com')
		expect(out.pathname).toBe(want.pathname)
		expect(out.search).toBe(want.search)
	})

	it('UUID bookingId redirects to booking assign anchor and strips unrelated params', () => {
		const out = buildOpsFulfilLegacyRedirectToBookingsUrl(
			new URL(`https://example.com/ops/fulfil?queue=paid&bookingId=${SAMPLE_UUID}&utm=1`),
		)
		expect(out.pathname).toBe(`${OPS_BOOKINGS_PATH}/${SAMPLE_UUID}`)
		expect(out.hash).toBe(OPS_BOOKING_ASSIGN_HREF_SUFFIX)
		expect(out.searchParams.has('utm')).toBe(false)
	})
})

describe('isOpsFulfilAssignPanelDeepLink', () => {
	it('is true when bookingId is non-empty', () => {
		const u = new URL('https://example.com/ops/fulfil?queue=paid&bookingId=x')
		expect(isOpsFulfilAssignPanelDeepLink(u)).toBe(true)
	})

	it('is false when bookingId absent or whitespace-only', () => {
		expect(isOpsFulfilAssignPanelDeepLink(new URL('https://example.com/ops/fulfil'))).toBe(
			false,
		)
		const u = new URL('https://example.com/ops/fulfil?bookingId=%20%20')
		expect(isOpsFulfilAssignPanelDeepLink(u)).toBe(false)
	})
})
