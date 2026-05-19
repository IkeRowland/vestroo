import { expect, test } from '@playwright/test'

import { OPS_BOOKINGS_DEFAULT_HREF, OPS_BOOKINGS_PATH, OPS_BOOKING_ASSIGN_HREF_SUFFIX } from '@/features/ops/ops-bookings-url'
import {
	OPS_BOOKINGS_NEEDS_ATTENTION_HREF,
	OPS_BOOKINGS_READY_TO_ASSIGN_HREF,
} from '@/lib/ops-bookings-queue-query'

/**
 * Legacy ops URLs: **`/ops/fulfil`** → **`/ops/bookings`** (queue presets + assign deep links), **`/ops/search`** →
 * **`/ops/bookings`** (`sq_*` advanced search), removed hub routes → **`/ops`**.
 *
 * Use **`maxRedirects: 0`** so we assert the first-hop **302** + **`Location`**, not follow-up
 * navigation.
 */

function assertFulfilRedirectsToBookings(
	location: string,
	expectedPathWithSearch: string,
	hint: string,
): void {
	const url = new URL(location, 'http://127.0.0.1:3000')
	const want = new URL(expectedPathWithSearch, 'http://127.0.0.1:3000')
	expect(`${url.pathname}${url.search}`, hint).toBe(`${want.pathname}${want.search}`)
}

test.describe('Legacy URL redirects (ops consolidation)', () => {
	test('/ops/fulfil and ?queue=paid → 302 to ready-to-assign bookings view', async ({ request }) => {
		for (const path of ['/ops/fulfil', '/ops/fulfil?queue=paid'] as const) {
			const res = await request.get(path, { maxRedirects: 0 })
			expect(res.status(), path).toBe(302)
			assertFulfilRedirectsToBookings(res.headers().location ?? '', OPS_BOOKINGS_READY_TO_ASSIGN_HREF, path)
		}
	})

	test('?queue=trip_request → trip-request intent on bookings', async ({ request }) => {
		const res = await request.get('/ops/fulfil?queue=trip_request', { maxRedirects: 0 })
		expect(res.status()).toBe(302)
		assertFulfilRedirectsToBookings(res.headers().location ?? '', OPS_BOOKINGS_DEFAULT_HREF, 'trip_request')
	})

	test('?queue=pending → needs-attention bookings view', async ({ request }) => {
		const res = await request.get('/ops/fulfil?queue=pending', { maxRedirects: 0 })
		expect(res.status()).toBe(302)
		assertFulfilRedirectsToBookings(res.headers().location ?? '', OPS_BOOKINGS_NEEDS_ATTENTION_HREF, 'pending')
	})

	test('/ops/search?q= → 302 to /ops/bookings with sq_q', async ({ request }) => {
		const res = await request.get('/ops/search?q=foo', { maxRedirects: 0 })
		expect(res.status()).toBe(302)
		const url = new URL(res.headers().location ?? '', 'http://127.0.0.1:3000')
		expect(url.pathname).toBe('/ops/bookings')
		expect(url.searchParams.get('sq_q')).toBe('foo')
	})

	test('/ops/board → 302 to /ops', async ({ request }) => {
		const res = await request.get('/ops/board', { maxRedirects: 0 })
		expect(res.status()).toBe(302)
		const url = new URL(res.headers().location ?? '', 'http://127.0.0.1:3000')
		expect(url.pathname).toBe('/ops')
	})

	test('/ops/fulfil deep link preserves bookingId as booking detail path', async ({ request }) => {
		const res = await request.get(
			'/ops/fulfil?queue=paid&bookingId=a1111111-1111-4111-8111-111111111111',
			{ maxRedirects: 0 },
		)
		expect(res.status()).toBe(302)
		const url = new URL(res.headers().location ?? '', 'http://127.0.0.1:3000')
		expect(url.pathname).toBe(
			`${OPS_BOOKINGS_PATH}/a1111111-1111-4111-8111-111111111111`,
		)
		if (url.hash) {
			expect(url.hash).toBe(OPS_BOOKING_ASSIGN_HREF_SUFFIX)
		}
	})
})
