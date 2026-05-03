/**
 * Server-only transactional email entrypoint (Resend).
 * Do not import from client components or files with `'use client'` — secrets stay off the
 * browser bundle (`RESEND_*` is never `NEXT_PUBLIC_*`).
 */
import { getResendClient } from './resend-client'
import { isResendTestApiKey } from './resend-test-api-key'

const LOG_PREFIX = '[vestroo:email]'

const DEFAULT_FROM_FALLBACK = 'noreply@vestroo.com'
const FROM_DISPLAY_NAME = 'Vestroo'

export type SendEmailInput = {
	to: string
	subject: string
	html: string
	/** When set, used as raw From address (before `Name <addr>` wrapping). Else env. */
	from?: string
	/**
	 * Optional provider headers (e.g. **List-Unsubscribe** for **15C.6**). Resend passes these through on send.
	 * **List-Unsubscribe-Post** is not set (no one-click token backend in v1).
	 */
	headers?: Record<string, string>
	/**
	 * Resend idempotency (24h dedupe). Same key + same payload → at most one outbound send.
	 * Story 13.8: stable per retry “wave” so double-clicks do not double-email.
	 */
	idempotencyKey?: string
}

export type SendEmailSuccess =
	| { ok: true; mode: 'sent'; messageId?: string }
	| { ok: true; mode: 'skipped_test_mode' }

export type SendEmailErrorKind =
	| 'missing_env'
	| 'validation'
	| 'resend_api'
	| 'network'
	| 'unknown'

export type SendEmailFailure = {
	ok: false
	error: {
		kind: SendEmailErrorKind
		message: string
	}
}

export type SendEmailResult = SendEmailSuccess | SendEmailFailure

function formatFromHeader(address: string): string {
	return `${FROM_DISPLAY_NAME} <${address}>`
}

function resolveFromAddress(input: SendEmailInput): string | SendEmailFailure {
	const override = input.from?.trim()
	if (override) return override
	const fromEnv = process.env.RESEND_FROM_EMAIL?.trim()
	if (fromEnv) return fromEnv
	if (process.env.NODE_ENV === 'production') {
		return {
			ok: false,
			error: {
				kind: 'missing_env',
				message: 'RESEND_FROM_EMAIL is required in production when `from` is not passed',
			},
		}
	}
	return DEFAULT_FROM_FALLBACK
}

/**
 * Sends one HTML email via Resend, or skips the API in **test mode** (see `isResendTestApiKey`).
 *
 * **Result shape (discriminated):**
 * - `{ ok: true, mode: 'sent', messageId? }` — Resend accepted the send
 * - `{ ok: true, mode: 'skipped_test_mode' }` — non-production + test API key; no HTTP call
 * - `{ ok: false, error: { kind, message } }` — validation, missing env, Resend error, or network
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
	const to = input.to?.trim()
	if (!to) {
		return { ok: false, error: { kind: 'validation', message: 'Recipient `to` is required' } }
	}
	const subject = input.subject?.trim()
	if (!subject) {
		return { ok: false, error: { kind: 'validation', message: 'Subject is required' } }
	}
	const html = input.html?.trim()
	if (!html) {
		return { ok: false, error: { kind: 'validation', message: 'HTML body is required' } }
	}

	const apiKey = process.env.RESEND_API_KEY?.trim() ?? ''
	const nodeEnv = process.env.NODE_ENV ?? 'development'

	/**
	 * Playwright Theme C (Story 13.12): deterministic Resend failure without outbound HTTP.
	 * Enabled only for the dedicated CI/local run that sets `E2E_SIMULATE_RESEND_API_FAILURE=1`
	 * on the Next.js process (see `playwright.config.ts`).
	 */
	if (nodeEnv !== 'production' && process.env.E2E_SIMULATE_RESEND_API_FAILURE === '1') {
		return {
			ok: false,
			error: {
				kind: 'resend_api',
				message: 'Simulated Resend API failure (E2E)',
			},
		}
	}

	if (nodeEnv !== 'production' && apiKey.length > 0 && isResendTestApiKey(apiKey)) {
		const fromForLog =
			input.from?.trim() ||
			process.env.RESEND_FROM_EMAIL?.trim() ||
			DEFAULT_FROM_FALLBACK
		console.info(`${LOG_PREFIX} skipped_test_mode (no Resend API call)`, {
			to,
			subject,
			from: fromForLog,
		})
		return { ok: true, mode: 'skipped_test_mode' }
	}

	if (!apiKey) {
		const message =
			nodeEnv === 'production'
				? 'RESEND_API_KEY is required in production for live sends'
				: 'RESEND_API_KEY is missing (use a `re_test_…` key in non-production to skip sends)'
		return { ok: false, error: { kind: 'missing_env', message } }
	}

	const fromResolved = resolveFromAddress(input)
	if (typeof fromResolved !== 'string') {
		return fromResolved
	}

	const idem = input.idempotencyKey?.trim()
	const idempotencyKey =
		idem && idem.length > 0 ? idem.slice(0, 256) : undefined

	try {
		const client = getResendClient(apiKey)
		const headers = input.headers
		const basePayload: {
			from: string
			to: string
			subject: string
			html: string
			headers?: Record<string, string>
		} = {
			from: formatFromHeader(fromResolved),
			to,
			subject,
			html: input.html,
		}
		if (headers && Object.keys(headers).length > 0) {
			basePayload.headers = headers
		}
		const result =
			idempotencyKey !== undefined
				? await client.emails.send(basePayload, { idempotencyKey })
				: await client.emails.send(basePayload)

		if (result.error) {
			return {
				ok: false,
				error: {
					kind: 'resend_api',
					message: result.error.message ?? 'Resend returned an error',
				},
			}
		}

		return { ok: true, mode: 'sent', messageId: result.data?.id }
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e)
		const lower = message.toLowerCase()
		const kind: SendEmailErrorKind =
			lower.includes('network') || lower.includes('fetch') || lower.includes('econnreset')
				? 'network'
				: 'unknown'
		return { ok: false, error: { kind, message } }
	}
}
