import { expect, type Page } from '@playwright/test'

/**
 * Shared invalid **`/track/*`** assertions (Epic 15 / **15B.7** + **15B.8** — US-C2, Q21).
 * **Owned by** **`epic15-17-track-token-invalid-privacy.spec.ts`**; **15B.8** reuses this module only
 * when it needs the same checks (avoid copy-pasting the denylist).
 */

/** Malformed base64url payload ≤32 bytes — **`verifyRiderTrackToken`** rejects before DB / signing init. */
export const RIDER_TRACK_MALFORMED_TOKEN = 'invalid.invalid.invalid'

/**
 * **PII denylist:** if any substring appears in response HTML, treat as a leak regression.
 * Fictional reserved tokens (not user-facing copy).
 */
export const RIDER_TRACK_PII_PROBE_DENYLIST = [
	'LEAK_15_17_DRIVER_FULL_NAME',
	'LEAK_15_17_PLATE_UNMASKED',
	'LEAK_15_17_BOOKING_REF',
] as const

export async function assertInvalidTrackSurface(page: Page, path: string) {
	await page.goto(path)

	await expect(page.getByRole('heading', { name: /Link expired or invalid/i })).toBeVisible()
	await expect(page.getByRole('link', { name: /Email support/i })).toBeVisible()
	await expect(page.getByRole('link', { name: /Contact page/i })).toBeVisible()

	const contact = page.getByRole('link', { name: /Contact page/i })
	await expect(contact).toHaveAttribute('href', '/contact')

	const mailto = page.getByRole('link', { name: /Email support/i })
	await expect(mailto).toHaveAttribute('href', /^mailto:/)

	const html = await page.content()
	for (const needle of RIDER_TRACK_PII_PROBE_DENYLIST) {
		expect(html, `HTML must not contain denylist probe "${needle}"`).not.toContain(needle)
	}

	const robots = page.locator('meta[name="robots"]')
	await expect(robots).toHaveCount(1)
	await expect(robots).toHaveAttribute('content', /noindex/i)
	await expect(robots).toHaveAttribute('content', /nofollow/i)
}
