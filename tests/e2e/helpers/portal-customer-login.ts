import type { Page } from '@playwright/test'

/** Sign in via `/account/login` and wait until `nextPath` is loaded (customer Supabase session). */
export async function portalCustomerLogin(
	page: Page,
	email: string,
	password: string,
	nextPath = '/account',
): Promise<void> {
	const next = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
	await page.goto(`/account/login?next=${encodeURIComponent(next)}`)
	await page.getByLabel('Email', { exact: true }).fill(email.trim())
	await page.getByLabel('Password', { exact: true }).fill(password)
	await page.getByRole('button', { name: 'Sign in' }).click()
	await page.waitForURL(`**${next}**`, { timeout: 60_000 })
}
