import { test, expect } from '@playwright/test'

import { opsStaffLogin } from './helpers/ops-staff-login'
import { portalCustomerLogin } from './helpers/portal-customer-login'

/**
 * Epic 15 / **15C.8** (Story **15.26**) — comms matrix E2E: **`/ops/comms`**, **`/account/preferences`**, and
 * **`{{` literal** guard on preview-rendered email HTML (not the dialog help text — it documents `{{` in copy).
 * **Transaction-class bypass** and **placeholders** for outbound sends: **`src/lib/comms/__tests__/dispatch-email.test.ts`**
 * + **`comms-event-category.test.ts`** (15.26 Progress Notes).
 *
 * **Read-only on `/ops/comms`** (no rule/template toggles) to avoid mutating the shared CI DB; see story Progress Notes.
 *
 * Reuses: **`E2E_OPS_STAFF_*`**, **`E2E_PORTAL_BOOKER_*`** (same spirit as 15.10 / 15.18 env gates).
 */

const supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
const supabaseKeysReady = supabaseUrl && supabaseAnon

const staffEmail = process.env.E2E_OPS_STAFF_EMAIL?.trim()
const staffPassword = process.env.E2E_OPS_STAFF_PASSWORD?.trim()
const staffReady = !!(staffEmail && staffPassword)

const bookerEmail = process.env.E2E_PORTAL_BOOKER_EMAIL?.trim()
const bookerPassword = process.env.E2E_PORTAL_BOOKER_PASSWORD?.trim()
const portalMemberReady = !!(bookerEmail && bookerPassword)

const suite15c8Ready = supabaseKeysReady && staffReady && portalMemberReady

test.describe('Epic 15C.8 — comms matrix (serial, Chromium)', () => {
	test.describe.configure({ mode: 'serial' })

	test.skip(
		!suite15c8Ready,
		'Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, E2E_OPS_STAFF_EMAIL/PASSWORD, and E2E_PORTAL_BOOKER_EMAIL/PASSWORD (see .env.test.example, Story 15.26).',
	)

	test('ops: `/ops/comms` — registry loads (read-only smoke, no rule mutations)', async ({ page }) => {
		await test.step('staff sign-in', async () => {
			await opsStaffLogin(page, staffEmail!, staffPassword!)
		})

		await test.step('comms registry', async () => {
			await page.goto('/ops/comms')
			await expect(page.getByRole('heading', { name: 'Comms registry' })).toBeVisible({ timeout: 60_000 })
			await expect(page.getByText('Registry could not be loaded')).toHaveCount(0)
			await expect(page.getByRole('heading', { name: 'Dispatch rules' })).toBeVisible()
			await expect(page.getByRole('heading', { name: 'Templates (metadata)' })).toBeVisible()
		})
	})

	test('ops: first email template — preview HTML has no literal `{{` in iframe (15C.4/§6 guard)', async ({
		page,
	}) => {
		await opsStaffLogin(page, staffEmail!, staffPassword!)
		await page.goto('/ops/comms')
		await expect(page.getByRole('heading', { name: 'Comms registry' })).toBeVisible({ timeout: 60_000 })

		const firstTemplatePreview = page
			.getByRole('table', { name: 'Comms templates' })
			.getByRole('button', { name: 'Preview' })
			.first()

		if ((await firstTemplatePreview.count()) === 0) {
			test.skip(
				true,
				'Seed at least one `comms_templates` row with channel=email, or use matrix UI when data exists.',
			)
		}

		await firstTemplatePreview.click()
		const dialog = page.getByRole('dialog', { name: 'Template preview' })
		await expect(dialog).toBeVisible()
		await expect(dialog.getByText('Loading preview…')).toBeHidden({ timeout: 60_000 })

		const noHtml = dialog.getByText('No HTML body is stored for this template.')
		if (await noHtml.isVisible().catch(() => false)) {
			/** Subject line still substitutes seeded vars — avoid false failures from help text in the dialog header. */
			const subjectLabel = dialog.getByText('Subject', { exact: true })
			await expect(subjectLabel).toBeVisible()
			const subjectP = subjectLabel.locator('..').locator('p').first()
			const subjectText = (await subjectP.textContent())?.trim() ?? ''
			expect(subjectText, 'expected non-empty subject for template without HTML body').not.toBe('')
			expect(subjectText, '15.26: subject should not leave raw {{ delimiters (seed map covers template keys)').not.toContain(
				'{{',
			)
			await dialog.getByRole('button', { name: 'Close' }).click()
			return
		}

		const iframe = page.frameLocator('iframe[title="Email HTML preview"]')
		await expect(iframe.locator('body')).toBeVisible({ timeout: 30_000 })
		const bodyText = (await iframe.locator('body').innerText()) + (await iframe.locator('body').textContent() ?? '')
		/** Iframe: rendered email only; dialog may contain `{{` in 15C.4 help text. */
		expect(bodyText).not.toContain('{{')
		await dialog.getByRole('button', { name: 'Close' }).click()
	})

	test('portal: preference centre — toggles, transactional locked, `?category=` highlight', async ({ page }) => {
		await test.step('member sign-in', async () => {
			await portalCustomerLogin(page, bookerEmail!, bookerPassword!, '/account/preferences?category=marketing')
		})

		await test.step('headings and sections', async () => {
			await expect(page.getByRole('heading', { name: 'Email preferences' })).toBeVisible({ timeout: 60_000 })
			await expect(page.getByRole('heading', { name: 'Informational email' })).toBeVisible()
			await expect(page.getByRole('heading', { name: 'Marketing email' })).toBeVisible()
			await expect(page.getByRole('heading', { name: 'Transactional email' })).toBeVisible()
		})

		const marketingBlock = page.locator('#prefs-marketing')
		await expect(marketingBlock).toBeVisible()
		await expect(marketingBlock).toHaveClass(/ring-2/)

		const transToggle = page.locator('#prefs-transactional input[type=checkbox]')
		await expect(transToggle).toBeVisible()
		await expect(transToggle).toBeChecked()
		await expect(transToggle).toBeDisabled()

		await page.goto('/account/preferences?category=informational')
		await expect(page.locator('#prefs-informational')).toHaveClass(/ring-2/)
	})
})
