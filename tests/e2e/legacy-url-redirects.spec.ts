import { expect, test } from '@playwright/test'

/**
 * Legacy ops URLs: **`/ops/fulfil`** → **`/ops/trips`** (queue preserved), **`/ops/search`** →
 * **`/ops/bookings`** (`sq_*` advanced search), removed hub routes → **`/ops`**.
 *
 * Use **`maxRedirects: 0`** so we assert the first-hop **302** + **`Location`**, not follow-up
 * navigation.
 */

function assertFulfilRedirectsToTrips(
	location: string,
	expectedQueue: string,
	hint: string,
): void {
	const url = new URL(location, 'http://127.0.0.1:3000')
	expect(url.pathname, hint).toBe('/ops/trips')
	expect(url.searchParams.get('queue'), hint).toBe(expectedQueue)
}

test.describe('Legacy URL redirects (ops consolidation)', () => {
	test('/ops/fulfil and ?queue=paid → 302 to /ops/trips?queue=paid', async ({ request }) => {
		for (const path of ['/ops/fulfil', '/ops/fulfil?queue=paid'] as const) {
			const res = await request.get(path, { maxRedirects: 0 })
			expect(res.status(), path).toBe(302)
			assertFulfilRedirectsToTrips(res.headers().location ?? '', 'paid', path)
		}
	})

	test('?queue=trip_request → /ops/trips?queue=trip_request', async ({ request }) => {
		const res = await request.get('/ops/fulfil?queue=trip_request', { maxRedirects: 0 })
		expect(res.status()).toBe(302)
		assertFulfilRedirectsToTrips(res.headers().location ?? '', 'trip_request', 'trip_request')
	})

	test('?queue=pending → /ops/trips?queue=pending', async ({ request }) => {
		const res = await request.get('/ops/fulfil?queue=pending', { maxRedirects: 0 })
		expect(res.status()).toBe(302)
		assertFulfilRedirectsToTrips(res.headers().location ?? '', 'pending', 'pending')
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

	test('/ops/fulfil deep link preserves bookingId on trips', async ({ request }) => {
		const res = await request.get(
			'/ops/fulfil?queue=paid&bookingId=a1111111-1111-4111-8111-111111111111',
			{ maxRedirects: 0 },
		)
		expect(res.status()).toBe(302)
		const url = new URL(res.headers().location ?? '', 'http://127.0.0.1:3000')
		expect(url.pathname).toBe('/ops/trips')
		expect(url.searchParams.get('queue')).toBe('paid')
		expect(url.searchParams.get('bookingId')).toBe('a1111111-1111-4111-8111-111111111111')
	})
})
