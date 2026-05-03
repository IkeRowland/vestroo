import { test, expect } from '@playwright/test'

import {
	dispatchSuggestionsEnabledFromEnv,
	parseUuidEnv,
	waitForCalibrationAssignAudit,
} from './helpers/ops-calibration-audit-e2e'
import { opsStaffLogin } from './helpers/ops-staff-login'
import { e2eServiceSupabase } from './helpers/supabase-e2e-service-client'

/**
 * Epic 15 / **`15D.5`** (Story **15.31**) — Playwright E2E for **Fulfil** dispatch suggestions, **`15D.3`**
 * calibration audits (service-role read), **`15D.4`** report smoke, and **opt-in** edge bookings.
 *
 * **Q25 / US-D1:** every assign is explicit **Create trip and link booking** — no auto-assign assertions.
 *
 * **Env (see `.env.test.example`):** core **`E2E_OPS_STAFF_*`** + **`NEXT_PUBLIC_SUPABASE_*`**; mutation tests
 * also need **`SUPABASE_SERVICE_ROLE_KEY`**, **`DISPATCH_SUGGESTIONS_ENABLED=1`** on the **Next** process
 * (`.env.test` is loaded by **`playwright.config.ts`** and forwarded via **`webServer.env`**), and seeded
 * **`E2E_15D5_*`** booking UUIDs in **`ready_to_assign`** without **`booking_trips`** until the test assigns.
 */

const supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
const supabasePublicReady = supabaseUrl && supabaseAnon

const staffEmail = process.env.E2E_OPS_STAFF_EMAIL?.trim()
const staffPassword = process.env.E2E_OPS_STAFF_PASSWORD?.trim()
const staffReady = !!(staffEmail && staffPassword)

const serviceRoleReady = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

const suggestionBookingId = parseUuidEnv(process.env.E2E_15D5_SUGGESTION_BOOKING_ID)
const freePickBookingId = parseUuidEnv(process.env.E2E_15D5_FREE_PICK_BOOKING_ID)
const allBusyBookingId = parseUuidEnv(process.env.E2E_15D5_ALL_BUSY_BOOKING_ID)
const thinDataBookingId =
		parseUuidEnv(process.env.E2E_15D5_THIN_DATA_BOOKING_ID) ?? suggestionBookingId

const dispatchOn = dispatchSuggestionsEnabledFromEnv()

const core15d5Ready = supabasePublicReady && staffReady

/** Service-role + dispatch flag — AC7 all-busy can run without suggestion/free-pick booking ids. */
const dispatchMutationBaseReady = core15d5Ready && serviceRoleReady && dispatchOn

const assignMutationReady =
	dispatchMutationBaseReady && suggestionBookingId !== null && freePickBookingId !== null

const coreSkipMessage =
	'Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, E2E_OPS_STAFF_EMAIL, E2E_OPS_STAFF_PASSWORD (see .env.test.example § Epic 15 / 15D.5).'

const assignSkipMessage =
	'Requires core env plus SUPABASE_SERVICE_ROLE_KEY, DISPATCH_SUGGESTIONS_ENABLED truthy (1/true/on), E2E_15D5_SUGGESTION_BOOKING_ID, and E2E_15D5_FREE_PICK_BOOKING_ID — see Story 15.31 Progress Notes.'

const dispatchMutationBaseSkipMessage =
	'Requires core env plus SUPABASE_SERVICE_ROLE_KEY and DISPATCH_SUGGESTIONS_ENABLED truthy (1/true/on) on the Next webServer — see `.env.test.example` § 15D.5.'

test.describe('Epic 15D.5 — dispatch suggestions E2E (serial, Chromium)', () => {
	test.describe.configure({ mode: 'serial' })

	test('15D.4 — `/ops/reports/suggestions` staff calibration report loads', async ({ page }) => {
		test.skip(!core15d5Ready, coreSkipMessage)

		await test.step('staff sign-in', async () => {
			await opsStaffLogin(page, staffEmail!, staffPassword!)
		})

		await test.step('calibration report', async () => {
			await page.goto('/ops/reports/suggestions')
			await expect(
				page.getByRole('heading', { name: 'Dispatch suggestions calibration' }),
			).toBeVisible({ timeout: 60_000 })
			await expect(page.getByText('Report could not be loaded')).toHaveCount(0)
			/** Rows in window: summary table (**15.30**) or documented empty state — both are non-error renders. */
			await expect(
				page
					.getByRole('heading', { name: 'Summary' })
					.or(page.getByText('No calibration assign audits in this window')),
			).toBeVisible({ timeout: 30_000 })
		})
	})

	test('15D.2 / AC2 — `/ops/fulfil` paid queue loads (no fetch error) when suggestions flag is on', async ({
		page,
	}) => {
		test.skip(!core15d5Ready, coreSkipMessage)
		test.skip(
			!dispatchOn,
			'Set DISPATCH_SUGGESTIONS_ENABLED=1 (or true/yes/on) in `.env.test` so the Next webServer enables the panel (see playwright.config.ts webServer.env).',
		)

		await opsStaffLogin(page, staffEmail!, staffPassword!)
		await page.goto('/ops/fulfil?queue=paid')
		await expect(page.getByRole('heading', { name: 'Fulfil' })).toBeVisible({ timeout: 60_000 })
		await expect(page.getByText('Bookings could not be loaded')).toHaveCount(0)
		await expect(page.getByText('Service runs could not be loaded')).toHaveCount(0)
	})

	test('AC6 — thin data: suggestions panel settles (list or documented empty)', async ({ page }) => {
		test.skip(!core15d5Ready, coreSkipMessage)
		test.skip(!dispatchOn, 'Same DISPATCH_SUGGESTIONS_ENABLED gate as AC2.')
		test.skip(
			!thinDataBookingId,
			'Set E2E_15D5_SUGGESTION_BOOKING_ID or E2E_15D5_THIN_DATA_BOOKING_ID to a paid-queue UUID.',
		)

		await opsStaffLogin(page, staffEmail!, staffPassword!)
		await page.goto(`/ops/fulfil?queue=paid&bookingId=${encodeURIComponent(thinDataBookingId)}`)
		await expect(page.getByRole('heading', { name: 'Fulfil' })).toBeVisible({ timeout: 60_000 })

		const panel = page.locator('[aria-label="Suggested vehicles"]')
		await expect(panel).toBeVisible({ timeout: 30_000 })
		await expect(panel.getByText('Loading suggestions…')).toHaveCount(0, { timeout: 60_000 })

		const hasRow = (await panel.getByRole('button').count()) > 0
		const emptyCopy = panel.getByText('No ranked suggestions for this booking.')
		const emptyVisible = await emptyCopy.isVisible().catch(() => false)
		expect(
			hasRow || emptyVisible,
			'Expected either ≥1 suggestion button or the documented empty copy (fleet <2 eligible vehicles per 15.27).',
		).toBe(true)
	})

	test('AC7 — all busy / excluded: empty panel copy; free-pick assign still succeeds', async ({ page }) => {
		test.skip(!dispatchMutationBaseReady, dispatchMutationBaseSkipMessage)
		test.skip(
			!allBusyBookingId,
			'Optional: set E2E_15D5_ALL_BUSY_BOOKING_ID to a booking UUID where suggestions return no rows but paid-queue assign still works.',
		)

		const svc = e2eServiceSupabase()
		if (!svc) test.skip(true, 'e2eServiceSupabase() returned null')

		await opsStaffLogin(page, staffEmail!, staffPassword!)
		await page.goto(`/ops/fulfil?queue=paid&bookingId=${encodeURIComponent(allBusyBookingId)}`)
		await expect(page.getByRole('heading', { name: 'Fulfil' })).toBeVisible({ timeout: 60_000 })

		const panel = page.locator('[aria-label="Suggested vehicles"]')
		await expect(panel.getByText('Loading suggestions…')).toHaveCount(0, { timeout: 60_000 })
		await expect(panel.getByText('No ranked suggestions for this booking.')).toBeVisible()

		await page.getByRole('button', { name: 'Create trip and link booking' }).click()
		await expect(page.getByText('Trip created and booking linked')).toBeVisible({ timeout: 120_000 })

		const payload = await waitForCalibrationAssignAudit(svc, allBusyBookingId, 'assignment_free_pick')
		expect(payload.booking_id).toBe(allBusyBookingId)
		expect(typeof payload.vehicle_id).toBe('string')
	})

	test('AC3+AC4 — suggestion click → prefill → assign; `assignment_from_suggestion` audit payload', async ({
		page,
	}) => {
		test.skip(!assignMutationReady, assignSkipMessage)

		const svc = e2eServiceSupabase()
		if (!svc) test.skip(true, 'e2eServiceSupabase() returned null')

		await opsStaffLogin(page, staffEmail!, staffPassword!)
		await page.goto(`/ops/fulfil?queue=paid&bookingId=${encodeURIComponent(suggestionBookingId!)}`)
		await expect(page.getByRole('heading', { name: 'Fulfil' })).toBeVisible({ timeout: 60_000 })

		const panel = page.locator('[aria-label="Suggested vehicles"]')
		await expect(panel.getByText('Loading suggestions…')).toHaveCount(0, { timeout: 60_000 })
		const firstSuggestion = panel.getByRole('button').first()
		if ((await firstSuggestion.count()) === 0) {
			test.skip(
				true,
				'No suggestion rows for E2E_15D5_SUGGESTION_BOOKING_ID — seed data so suggestVehiclesForBooking returns ≥1 row, or pick another booking.',
			)
		}

		await test.step('click first suggestion (prefills vehicle)', async () => {
			await firstSuggestion.click()
		})

		await page.getByRole('button', { name: 'Create trip and link booking' }).click()
		await expect(page.getByText('Trip created and booking linked')).toBeVisible({ timeout: 120_000 })

		const payload = await waitForCalibrationAssignAudit(
			svc,
			suggestionBookingId!,
			'assignment_from_suggestion',
		)
		expect(payload.booking_id).toBe(suggestionBookingId)
		expect(typeof payload.vehicle_id).toBe('string')
		expect(typeof payload.service_run_id).toBe('string')
		expect(typeof payload.chauffeur_id).toBe('string')
		expect(typeof payload.trip_id).toBe('string')
		expect(typeof payload.score).toBe('number')
		expect([1, 2, 3]).toContain(payload.rank as number)
	})

	test('AC5 — free-pick assign → `assignment_free_pick` audit', async ({ page }) => {
		test.skip(!assignMutationReady, assignSkipMessage)

		const svc = e2eServiceSupabase()
		if (!svc) test.skip(true, 'e2eServiceSupabase() returned null')

		await opsStaffLogin(page, staffEmail!, staffPassword!)
		await page.goto(`/ops/fulfil?queue=paid&bookingId=${encodeURIComponent(freePickBookingId!)}`)
		await expect(page.getByRole('heading', { name: 'Fulfil' })).toBeVisible({ timeout: 60_000 })

		const panel = page.locator('[aria-label="Suggested vehicles"]')
		await expect(panel.getByText('Loading suggestions…')).toHaveCount(0, { timeout: 60_000 })
		/** Do not click a suggestion row — vehicle stays default / manually chosen → free-pick audit. */
		await page.getByRole('button', { name: 'Create trip and link booking' }).click()
		await expect(page.getByText('Trip created and booking linked')).toBeVisible({ timeout: 120_000 })

		const payload = await waitForCalibrationAssignAudit(svc, freePickBookingId!, 'assignment_free_pick')
		expect(payload.booking_id).toBe(freePickBookingId)
		expect(typeof payload.vehicle_id).toBe('string')
		expect('rank' in payload).toBe(false)
		expect('score' in payload).toBe(false)
	})

	test('AC8 stretch — calibration report shows non-zero denominator after assigns', async ({ page }) => {
		test.skip(!assignMutationReady, assignSkipMessage)

		const minDenominator = allBusyBookingId ? 3 : 2

		await opsStaffLogin(page, staffEmail!, staffPassword!)
		await page.goto('/ops/reports/suggestions?days=30')
		await expect(
			page.getByRole('heading', { name: 'Dispatch suggestions calibration' }),
		).toBeVisible({ timeout: 60_000 })

		const totalRow = page.locator('tr', { hasText: 'Total calibration rows (denominator)' })
		await expect(totalRow).toBeVisible()
		const valueCell = totalRow.locator('td').nth(1)
		const raw = ((await valueCell.textContent()) ?? '').trim()
		const n = Number.parseInt(raw, 10)
		expect(
			Number.isFinite(n) && n >= minDenominator,
			`expected calibration denominator ≥ ${minDenominator} after serial assigns, got "${raw}"`,
		).toBe(true)
	})
})
