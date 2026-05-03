import type { Page } from '@playwright/test'

export async function opsStaffLogin(page: Page, email: string, password: string): Promise<void> {
	const next = '/ops/bookings'
	await page.goto(`/ops/login?next=${encodeURIComponent(next)}`)
	await page.getByLabel('Email').fill(email.trim())
	await page.getByLabel('Password').fill(password)
	await page.getByRole('button', { name: 'Sign in' }).click()
	await page.waitForURL(`**${next}**`, { timeout: 60_000 })
}
