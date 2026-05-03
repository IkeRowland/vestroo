import { test, expect } from '@playwright/test'

import { cleanupCommsRetryBooking, seedCommsRetryBooking } from './helpers/epic13-comms-retry-seed'
import { e2eCreateBookingQuote, e2eSendBookingQuote } from './helpers/booking-quote-e2e-api'
import { epic13ServiceClient, resolveProfileIdByEmail } from './helpers/epic13-service-client'
import { opsStaffLogin } from './helpers/ops-staff-login'

/**
 * Epic 13 — Theme C (Story 13.12): Resend path returns 500-class failure; quote stays `sent`; comms-retry queue lists the row.
 *
 * Requires **`E2E_SIMULATE_RESEND_API_FAILURE=1`** when invoking Playwright so the managed `webServer` starts Next.js
 * with simulated Resend failures (see `playwright.config.ts` — default `chromium` project **excludes** this file so
 * Story **14.10** quote email is not broken). Example:
 * `E2E_SIMULATE_RESEND_API_FAILURE=1 npx playwright test tests/e2e/epic13-theme-c-resend-failure.spec.ts`
 */

const staffCreds =
	!!process.env.E2E_OPS_STAFF_EMAIL?.trim() && !!process.env.E2E_OPS_STAFF_PASSWORD?.trim()

test.describe('Epic 13 — Theme C (Resend 500 → comms retry)', () => {
	test.describe.configure({ mode: 'serial' })

	test.skip(
		process.env.E2E_SIMULATE_RESEND_API_FAILURE !== '1',
		'Run with E2E_SIMULATE_RESEND_API_FAILURE=1 so Playwright starts Next.js with simulated Resend failures (see playwright.config.ts).',
	)

	test.skip(
		!staffCreds || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY,
		'Requires E2E_OPS_STAFF_* + Supabase URL + SUPABASE_SERVICE_ROLE_KEY.',
	)

	const svc = epic13ServiceClient()
	if (!svc) throw new Error('epic13ServiceClient() requires env')
	let seed: Awaited<ReturnType<typeof seedCommsRetryBooking>>

	test.beforeAll(async () => {
		const email = process.env.E2E_OPS_STAFF_EMAIL!.trim()
		const profileId = await resolveProfileIdByEmail(svc, email)
		if (!profileId) throw new Error(`No profile for ${email}`)
		seed = await seedCommsRetryBooking(svc, profileId, email)
	})

	test.afterAll(async () => {
		await cleanupCommsRetryBooking(svc, seed)
	})

	test('send fails → quote remains sent + comms-retry queue shows row', async ({ page }) => {
		await opsStaffLogin(page, process.env.E2E_OPS_STAFF_EMAIL!, process.env.E2E_OPS_STAFF_PASSWORD!)

		const createRes = await e2eCreateBookingQuote(page.request, {
			bookingId: seed.bookingId,
			totalZar: 900,
			lineItems: [{ label: 'Retry seed', qty: 1, unit_zar: 900, total_zar: 900 }],
		})
		expect(createRes.ok(), await createRes.text()).toBeTruthy()
		const created = (await createRes.json()) as { quoteId?: string }
		const quoteId = created.quoteId as string

		const sendRes = await e2eSendBookingQuote(page.request, quoteId)
		expect(sendRes.ok()).toBe(false)
		const body = (await sendRes.json()) as { ok?: boolean; error?: { code?: string } }
		expect(body.ok).toBe(false)
		expect(body.error?.code).toBe('EMAIL')

		await expect
			.poll(async () => {
				const { data } = await svc.from('booking_quotes').select('status').eq('id', quoteId).maybeSingle()
				return (data?.status as string | null | undefined) ?? null
			})
			.toBe('sent')

		await page.goto('/ops/bookings/comms-retry')
		await expect(page.locator(`[data-testid="ops-comms-retry-row"][data-quote-id="${quoteId}"]`)).toBeVisible({
			timeout: 30_000,
		})
	})
})
