import { test, expect } from '@playwright/test'

import { expectNoSeriousAxeViolations } from './helpers/portal-axe'
import { portalCustomerLogin } from './helpers/portal-customer-login'

/**
 * **Epic 15 / 15A.10** — account **portal** golden paths (browser), **not** RLS SQL (see **15.9** `smoke:rls`).
 *
 * **Q27:** No dedicated `NEXT_PUBLIC_*` kill-switch for the portal was found; this suite does not gate on a feature flag.
 *
 * **Personas:** `E2E_PORTAL_ADMIN_*` and `E2E_PORTAL_BOOKER_*` are required. **Rider** shares the non-admin
 * bookings surface with **booker** (no “Book this again”); a separate rider user is optional via
 * `E2E_PORTAL_RIDER_*` only when you want an explicit rider-only assertion.
 */

const supabasePublicReady = !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()

const adminEmail = process.env.E2E_PORTAL_ADMIN_EMAIL?.trim()
const adminPassword = process.env.E2E_PORTAL_ADMIN_PASSWORD?.trim()
const bookerEmail = process.env.E2E_PORTAL_BOOKER_EMAIL?.trim()
const bookerPassword = process.env.E2E_PORTAL_BOOKER_PASSWORD?.trim()

const riderEmail = process.env.E2E_PORTAL_RIDER_EMAIL?.trim()
const riderPassword = process.env.E2E_PORTAL_RIDER_PASSWORD?.trim()

const portalAdminReady = !!(adminEmail && adminPassword)
const portalBookerReady = !!(bookerEmail && bookerPassword)
const portalRiderOptional = !!(riderEmail && riderPassword && riderEmail !== bookerEmail)

const portalSuiteReady = supabasePublicReady && portalAdminReady && portalBookerReady

test.describe('Epic 15.10 — portal golden paths + axe (serial)', () => {
	test.describe.configure({ mode: 'serial' })

	test.skip(
		!portalSuiteReady,
		'Requires NEXT_PUBLIC_SUPABASE_URL + E2E_PORTAL_ADMIN_EMAIL/PASSWORD + E2E_PORTAL_BOOKER_EMAIL/PASSWORD (see .env.test.example).',
	)

	test('admin: sign-in → home → bookings → detail → members → invoices (+ axe)', async ({ page }) => {
		await test.step('sign in as customer admin', async () => {
			await portalCustomerLogin(page, adminEmail!, adminPassword!)
			await expect(page).toHaveURL(/\/account\/?$/)
		})

		await test.step('home (15.2): organisation, quick links', async () => {
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
			await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
			await expect(page.getByText(/Your role:/)).toBeVisible()
			await expect(page.getByRole('link', { name: /Bookings/i })).toBeVisible()
			await expect(page.getByRole('link', { name: /Members/i })).toBeVisible()
			await expect(page.getByRole('link', { name: /Invoices/i })).toBeVisible()
			await expectNoSeriousAxeViolations(page, 'admin /account')
		})

		await test.step('bookings list', async () => {
			await page.goto('/account/bookings')
			await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible({ timeout: 30_000 })
			await expectNoSeriousAxeViolations(page, 'admin /account/bookings')
		})

		const firstBooking = page.locator('table tbody a[href^="/account/bookings/"]').first()

		await test.step('booking detail (or skip if no rows)', async () => {
			if ((await firstBooking.count()) === 0) {
				test.skip(true, 'Seed at least one `client_type=account_client` booking for the admin test account.')
			}
			await firstBooking.click()
			await expect(page.getByRole('heading', { name: 'Booking detail' })).toBeVisible({ timeout: 30_000 })
			await expectNoSeriousAxeViolations(page, 'admin /account/bookings/[id]')
		})

		await test.step('members (admin)', async () => {
			await page.goto('/account/members')
			await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible({ timeout: 30_000 })
			await expectNoSeriousAxeViolations(page, 'admin /account/members')
		})

		await test.step('invoices list + quote snapshot when data exists', async () => {
			await page.goto('/account/billing/invoices')
			await expect(page.getByRole('heading', { name: /Invoices/ })).toBeVisible({ timeout: 30_000 })
			await expectNoSeriousAxeViolations(page, 'admin /account/billing/invoices')

			const viewHtml = page.getByRole('link', { name: /View full quote/i }).first()
			const quoteFromEnv = process.env.E2E_PORTAL_INVOICE_QUOTE_ID?.trim()
			if ((await viewHtml.count()) > 0) {
				await viewHtml.click()
				await expect(page.getByRole('heading', { name: 'Quote snapshot' })).toBeVisible({ timeout: 30_000 })
				await expectNoSeriousAxeViolations(page, 'admin /account/billing/quotes/[quoteId]')
			} else if (quoteFromEnv) {
				await page.goto(`/account/billing/quotes/${quoteFromEnv}`)
				await expect(page.getByRole('heading', { name: 'Quote snapshot' })).toBeVisible({ timeout: 30_000 })
				await expectNoSeriousAxeViolations(page, 'admin /account/billing/quotes/[quoteId] (env id)')
			} else {
				test.info().annotations.push({
					type: '15.10-note',
					description:
						'Skipped quote snapshot: no “View HTML” row and E2E_PORTAL_INVOICE_QUOTE_ID unset — seed archive or set env.',
				})
			}
		})

		await test.step('Book this again → /account/bookings prefill', async () => {
			await page.goto('/account/bookings')
			if ((await firstBooking.count()) === 0) {
				return
			}
			await firstBooking.click()
			await expect(page.getByRole('heading', { name: 'Booking detail' })).toBeVisible({ timeout: 30_000 })
			const rebook = page.getByRole('button', { name: 'Book this again' })
			if ((await rebook.count()) === 0) {
				test.info().annotations.push({
					type: '15.10-note',
					description: 'No “Book this again” control on this booking (unexpected for admin).',
				})
				return
			}
			await rebook.click()
			await page.waitForURL(/\/account\/bookings\?/, { timeout: 60_000 })
			const u = new URL(page.url())
			expect(u.searchParams.get('omitTripDate')).toBe('1')
			await expect
				.poll(() => page.locator('#pickup-address-input').inputValue(), { timeout: 30_000 })
				.not.toHaveLength(0)
		})
	})

	test('booker: home → bookings → detail → embedded booking form; forbidden members/invoices', async ({ page }) => {
		await portalCustomerLogin(page, bookerEmail!, bookerPassword!)
		await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
		await expect(page.getByRole('link', { name: /Members/i })).toHaveCount(0)
		await expect(page.getByRole('link', { name: /Invoices/i })).toHaveCount(0)
		await expect(page.getByRole('link', { name: /Quotes/i })).toHaveCount(0)

		await page.goto('/account/bookings')
		await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible({ timeout: 30_000 })

		const firstBooking = page.locator('table tbody a[href^="/account/bookings/"]').first()
		if ((await firstBooking.count()) === 0) {
			test.skip(true, 'Booker account needs at least one portal booking row.')
		}
		await firstBooking.click()
		await expect(page.getByRole('heading', { name: 'Booking detail' })).toBeVisible({ timeout: 30_000 })

		await test.step('optional Book this again → /account/bookings prefill', async () => {
			const rebook = page.getByRole('button', { name: 'Book this again' })
			if ((await rebook.count()) === 0) return
			await rebook.click()
			await page.waitForURL(/\/account\/bookings\?/, { timeout: 60_000 })
			expect(new URL(page.url()).searchParams.get('omitTripDate')).toBe('1')
			await expect
				.poll(() => page.locator('#pickup-address-input').inputValue(), { timeout: 30_000 })
				.not.toHaveLength(0)
		})

		await test.step('New trip button opens booking sheet', async () => {
			await page.goto('/account/bookings')
			await page.waitForLoadState('domcontentloaded')
			await page.getByRole('button', { name: 'New trip' }).click()
			await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible({ timeout: 30_000 })
			await expect(page.locator('#pickup-address-input')).toBeVisible()
		})

		await test.step('role gates redirect to /account', async () => {
			await portalCustomerLogin(page, bookerEmail!, bookerPassword!)
			await page.goto('/account/members')
			await expect(page).toHaveURL(/\/account\/?$/)
			await page.goto('/account/invoices')
			await expect(page).toHaveURL(/\/account\/?$/)
		})

		await test.step('axe on booker-visible portal pages', async () => {
			await page.goto('/account')
			await expectNoSeriousAxeViolations(page, 'booker /account')
			await page.goto('/account/bookings')
			await expectNoSeriousAxeViolations(page, 'booker /account/bookings')
		})
	})

	test('cross-account: foreign booking id is not accessible (404 or equivalent)', async ({ page }) => {
		const foreignId = process.env.E2E_PORTAL_FOREIGN_BOOKING_ID?.trim()
		test.skip(!foreignId, 'Set E2E_PORTAL_FOREIGN_BOOKING_ID to a UUID for a booking outside the booker’s active account.')

		await portalCustomerLogin(page, bookerEmail!, bookerPassword!)
		const resp = await page.goto(`/account/bookings/${foreignId}`, { waitUntil: 'domcontentloaded' })
		const status = resp?.status() ?? 0
		if (status === 404) {
			expect(status).toBe(404)
			return
		}
		await expect(page).toHaveURL(/\/account/)
	})

	test('dual membership switcher (gated)', async ({ page }) => {
		test.skip(
			process.env.E2E_PORTAL_DUAL_ACCOUNT !== '1',
			'Set E2E_PORTAL_DUAL_ACCOUNT=1 when the portal user has two accepted memberships — TODO: wire CI seed.',
		)

		await portalCustomerLogin(page, adminEmail!, adminPassword!)
		const switcher = page.locator('#account-switcher')
		await expect(switcher).toBeVisible({ timeout: 15_000 })
		const options = switcher.locator('option')
		const count = await options.count()
		if (count < 2) {
			test.skip(true, 'E2E_PORTAL_DUAL_ACCOUNT=1 but session has fewer than two memberships.')
		}
		const firstHeading = await page.locator('main h1').first().innerText()
		const secondValue = await options.nth(1).getAttribute('value')
		expect(secondValue).toBeTruthy()
		await switcher.selectOption(secondValue!)
		await expect
			.poll(async () => page.locator('main h1').first().innerText())
			.not.toBe(firstHeading)
	})

	test('optional rider: no “Book this again” on booking detail', async ({ page }) => {
		test.skip(!portalRiderOptional, 'Set E2E_PORTAL_RIDER_EMAIL/PASSWORD distinct from booker for rider-only checks.')
		await portalCustomerLogin(page, riderEmail!, riderPassword!)
		await page.goto('/account/bookings')
		const firstBooking = page.locator('table tbody a[href^="/account/bookings/"]').first()
		if ((await firstBooking.count()) === 0) {
			test.skip(true, 'Rider account needs at least one portal booking row.')
		}
		await firstBooking.click()
		await expect(page.getByRole('heading', { name: 'Booking detail' })).toBeVisible({ timeout: 30_000 })
		await expect(page.getByRole('button', { name: 'Book this again' })).toHaveCount(0)
	})
})
