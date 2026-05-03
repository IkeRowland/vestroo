import { test, expect } from '@playwright/test'

import { e2eServiceSupabase } from './helpers/supabase-e2e-service-client'
import { mintRiderTrackTokenForTripId, resolveTripIdForRiderTrackE2e } from './helpers/rider-track-mint-token'

/**
 * Epic 15 / **Theme E — `15B.8`** (Story **15.18**) — coherent rider-tracking Playwright: **public**
 * **`/track/*`** valid path, optional **live map** (Q22), optional **field** indicator (15B.6).
 *
 * **Invalid / expired token + PII denylist:** **owned** by **`epic15-17-track-token-invalid-privacy.spec.ts`**
 * + **`tests/e2e/helpers/rider-track-privacy.ts`** — **not** duplicated here (15.18 AC1–2).
 *
 * **SMS (15B.4):** no live SMS assertions — provider/outbox is not an E2E hard dependency (AC6).
 *
 * **Portal / 15A:** not used — **`/track`** is anonymous (Q21).
 */

test.describe.configure({ mode: 'serial' })

const riderTrackHappyPathGate =
	!!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
	!!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
	!!process.env.QUOTE_LINK_SIGNING_KEY?.trim()

test.describe('Epic 15B.8 — rider tracking + privacy (orchestrated)', () => {
	test('valid token: trip status + progress region (skip without Supabase trip + signing key)', async ({
		page,
	}) => {
		test.skip(
			!riderTrackHappyPathGate,
			'Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + QUOTE_LINK_SIGNING_KEY (see .env.test.example).',
		)
		const svc = e2eServiceSupabase()
		if (!svc) test.skip(true, 'e2eServiceSupabase() returned null')
		const tripId = await resolveTripIdForRiderTrackE2e(svc)
		test.skip(
			!tripId,
			'Seed at least one `trips` row or set E2E_RIDER_TRACK_TRIP_ID to a valid trip UUID.',
		)
		const token = mintRiderTrackTokenForTripId(tripId)
		await page.goto(`/track/${encodeURIComponent(token)}`)
		await expect(page.getByRole('heading', { name: 'Trip status' })).toBeVisible({ timeout: 60_000 })
		await expect(page.getByRole('region', { name: 'Trip progress' })).toBeVisible()
	})

	test('live map (Q22) — opt-in when E2E_RIDER_LIVE_MAP=1', async ({ page }) => {
		test.skip(
			process.env.E2E_RIDER_LIVE_MAP !== '1',
			'Set E2E_RIDER_LIVE_MAP=1 plus RIDER_LIVE_LOCATION_ENABLED=1, NEXT_PUBLIC_GOOGLE_MAPS_KEY, and a trip with live position + account live_rider_tracking (see .env.test.example).',
		)
		test.skip(
			process.env.RIDER_LIVE_LOCATION_ENABLED !== '1',
			'RIDER_LIVE_LOCATION_ENABLED=1 must be set on the Next webServer for this assertion.',
		)
		test.skip(!riderTrackHappyPathGate, 'Requires Supabase + QUOTE_LINK_SIGNING_KEY (same as valid-token test).')
		const tripId =
			process.env.E2E_RIDER_LIVE_MAP_TRIP_ID?.trim() ||
			process.env.E2E_RIDER_TRACK_TRIP_ID?.trim() ||
			null
		test.skip(
			!tripId,
			'Set E2E_RIDER_LIVE_MAP_TRIP_ID (or E2E_RIDER_TRACK_TRIP_ID) to a trip UUID that yields a live map (vehicle position + en_route/completed + live_rider_tracking).',
		)
		const token = mintRiderTrackTokenForTripId(tripId)
		await page.goto(`/track/${encodeURIComponent(token)}`)
		await expect(page.getByRole('heading', { name: 'Trip status' })).toBeVisible({ timeout: 60_000 })
		await expect(page.getByText('Live location', { exact: true })).toBeVisible({ timeout: 45_000 })
		await expect(
			page.locator('iframe[title="Chauffeur approximate map location"]'),
		).toBeVisible({ timeout: 30_000 })
	})

	test('field — Live tracking ON indicator (15B.6, opt-in)', async ({ page }) => {
		const email = process.env.E2E_FIELD_CHAUFFEUR_EMAIL?.trim()
		const password = process.env.E2E_FIELD_CHAUFFEUR_PASSWORD?.trim()
		const tripId = process.env.E2E_FIELD_LIVE_TRACK_TRIP_ID?.trim()
		test.skip(
			!email || !password || !tripId,
			'Optional: set E2E_FIELD_CHAUFFEUR_EMAIL, E2E_FIELD_CHAUFFEUR_PASSWORD, E2E_FIELD_LIVE_TRACK_TRIP_ID (chauffeur-owned trip with account live_rider_tracking).',
		)
		const next = `/field/trips/${tripId}`
		await page.goto(`/field/login?next=${encodeURIComponent(next)}`)
		await page.locator('#field-email').fill(email)
		await page.locator('#field-password').fill(password)
		await page.getByRole('button', { name: 'Sign in' }).click()
		await expect(page).toHaveURL(new RegExp(`/field/trips/${tripId}`), { timeout: 45_000 })
		await expect(page.getByText('Live tracking: ON', { exact: true })).toBeVisible({ timeout: 15_000 })
	})
})
