import { describe, expect, it } from 'vitest'

import {
	buildOpsFulfilLegacyRedirectToTripsUrl,
	isOpsFulfilAssignPanelDeepLink,
} from '@/lib/ops-fulfil-legacy-redirect'

describe('buildOpsFulfilLegacyRedirectToTripsUrl', () => {
	it('maps default, paid, and unknown queues to paid on /ops/trips', () => {
		for (const path of [
			'https://example.com/ops/fulfil',
			'https://example.com/ops/fulfil?queue=paid',
			'https://example.com/ops/fulfil?queue=unknown',
		] as const) {
			const out = buildOpsFulfilLegacyRedirectToTripsUrl(new URL(path))
			expect(out.origin).toBe('https://example.com')
			expect(out.pathname).toBe('/ops/trips')
			expect(out.searchParams.get('queue')).toBe('paid')
		}
	})

	it('maps trip_request (and trip-request) queue', () => {
		for (const q of ['trip_request', 'trip-request'] as const) {
			const out = buildOpsFulfilLegacyRedirectToTripsUrl(
				new URL(`https://example.com/ops/fulfil?queue=${q}`),
			)
			expect(out.pathname).toBe('/ops/trips')
			expect(out.searchParams.get('queue')).toBe('trip_request')
		}
	})

	it('maps pending queue', () => {
		const out = buildOpsFulfilLegacyRedirectToTripsUrl(
			new URL('https://example.com/ops/fulfil?queue=pending'),
		)
		expect(out.pathname).toBe('/ops/trips')
		expect(out.searchParams.get('queue')).toBe('pending')
	})

	it('preserves bookingId and strips unrelated params', () => {
		const out = buildOpsFulfilLegacyRedirectToTripsUrl(
			new URL('https://example.com/ops/fulfil?queue=paid&bookingId=x&utm=1'),
		)
		expect(out.searchParams.get('queue')).toBe('paid')
		expect(out.searchParams.get('bookingId')).toBe('x')
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
