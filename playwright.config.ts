import { defineConfig, devices } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Load `.env.test` into `process.env` when present (no extra deps; simple KEY=value lines).
 * CI should inject the same variables via secrets instead.
 */
function loadEnvTestFile(): void {
	const p = resolve(process.cwd(), '.env.test')
	if (!existsSync(p)) return
	const text = readFileSync(p, 'utf8')
	for (const line of text.split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue
		const eq = trimmed.indexOf('=')
		if (eq <= 0) continue
		const key = trimmed.slice(0, eq).trim()
		let val = trimmed.slice(eq + 1).trim()
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1)
		}
		if (process.env[key] === undefined) {
			process.env[key] = val
		}
	}
}

loadEnvTestFile()

const quoteLinkKey =
	process.env.QUOTE_LINK_SIGNING_KEY?.trim() ||
	'01234567890123456789012345678901'

const simulateResendFailure = process.env.E2E_SIMULATE_RESEND_API_FAILURE === '1'

/**
 * Epic 13 Theme C forces Resend failures on the **Next.js** process. That breaks walk-in **Send quote**
 * (Story 14.10), so we only enable it when running the dedicated Epic 13 project (see `projects` below).
 */
const webServerEnv = {
	...process.env,
	/** Epic 15 / **15D.5** — forward from `.env.test` / CI so `isDispatchSuggestionsEnabled()` is true in `next dev`. */
	DISPATCH_SUGGESTIONS_ENABLED: process.env.DISPATCH_SUGGESTIONS_ENABLED?.trim() ?? '',
	E2E_ENABLE_BOOKING_QUOTE_API: '1',
	QUOTE_LINK_SIGNING_KEY: quoteLinkKey,
	RESEND_API_KEY: process.env.RESEND_API_KEY?.trim() || 're_test_playwright_skip',
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://127.0.0.1:3000',
	...(simulateResendFailure ? { E2E_SIMULATE_RESEND_API_FAILURE: '1' as const } : {}),
}

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://127.0.0.1:3000',
		trace: 'on-first-retry',
		...devices['Desktop Chrome'],
	},
	projects: simulateResendFailure
		? [
				{
					name: 'epic13-retry-chromium',
					testMatch: /epic13-theme-c-resend-failure\.spec\.ts/,
					use: { ...devices['Desktop Chrome'] },
				},
			]
		: [
				{
					name: 'chromium',
					testIgnore: /epic13-theme-c-resend-failure\.spec\.ts/,
					use: { ...devices['Desktop Chrome'] },
				},
			],
	webServer: {
		command: 'npx next dev -H 127.0.0.1 -p 3000',
		url: 'http://127.0.0.1:3000',
		reuseExistingServer: !process.env.CI,
		/** Cold `next dev` + first compile on Windows can exceed 120s in sparse CI agents. */
		timeout: 240_000,
		env: webServerEnv,
	},
})
