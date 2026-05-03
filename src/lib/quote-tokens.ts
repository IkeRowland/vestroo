import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Stateless quote deep-link payload (camelCase per US-B1).
 *
 * **`exp`:** Unix epoch in **milliseconds (UTC)**. Callers should align with
 * `booking_quotes.expires_at` by rounding that timestamp to the **nearest second** in UTC,
 * converting to ms since epoch, and passing that value so DB expiry and token expiry stay consistent.
 */
export type QuoteTokenPayload = {
	quoteId: string
	bookingId: string
	purpose: 'accept' | 'reject' | 'pay'
	/** Expiry instant as UTC epoch milliseconds. */
	exp: number
}

export type QuoteTokenPurpose = QuoteTokenPayload['purpose']

export type VerifyQuoteTokenOptions = {
	expectedPurpose?: QuoteTokenPurpose
}

export type VerifyQuoteTokenOk = { valid: true; payload: QuoteTokenPayload }

export type VerifyQuoteTokenFail = {
	valid: false
	reason: 'expired' | 'invalid_signature' | 'malformed'
	/** When **`reason === 'expired'`**, the MAC and shape were valid — safe for Q17 deep-link (no PII beyond trip fields). */
	payload?: QuoteTokenPayload
}

export type VerifyQuoteTokenResult = VerifyQuoteTokenOk | VerifyQuoteTokenFail

/**
 * Derives token **`exp`** (UTC epoch **milliseconds**) from **`booking_quotes.expires_at`** so HMAC
 * expiry matches DB quote window (Epic **14.2** — nearest second).
 */
export function quoteTokenExpiryMsFromExpiresAtIso(expiresAtIso: string): number {
	const t = new Date(expiresAtIso).getTime()
	if (Number.isNaN(t)) {
		throw new Error('Invalid expires_at for quote token')
	}
	return Math.round(t / 1000) * 1000
}

/**
 * Opaque token: **single base64url string** = `Buffer.concat([bodyUtf8, hmacSha256Digest])` encoded
 * as base64url (same layout as `dispatch-override-token.ts`: JSON body bytes then 32-byte MAC).
 * The JSON body uses a **fixed key order** (`quoteId`, `bookingId`, `purpose`, `exp`) so signing
 * and verification hash identical UTF-8 bytes.
 */
let cachedQuoteLinkSigningKey: string | undefined

/**
 * Deterministic secret used only when **`NODE_ENV !== 'production'`** and
 * **`QUOTE_LINK_SIGNING_KEY`** is unset — so `next dev` can mint `/q/*` links without local
 * `.env` friction. **Never used in production** (see {@link registerQuoteLinkSigningKeyFromEnvInInstrumentation}).
 */
const QUOTE_LINK_SIGNING_KEY_DEV_FALLBACK =
	'vestroo-local-dev-quote-link-signing-key-min-32-chars'

const PURPOSES: readonly QuoteTokenPurpose[] = ['accept', 'reject', 'pay']

function isQuoteTokenPurpose(value: unknown): value is QuoteTokenPurpose {
	return typeof value === 'string' && (PURPOSES as readonly string[]).includes(value)
}

function canonicalPayloadJson(payload: QuoteTokenPayload): string {
	return JSON.stringify({
		quoteId: payload.quoteId,
		bookingId: payload.bookingId,
		purpose: payload.purpose,
		exp: payload.exp,
	})
}

function assertPayloadShape(data: unknown): data is QuoteTokenPayload {
	if (typeof data !== 'object' || data === null) {
		return false
	}
	const o = data as Record<string, unknown>
	if (typeof o.quoteId !== 'string' || o.quoteId.length === 0) {
		return false
	}
	if (typeof o.bookingId !== 'string' || o.bookingId.length === 0) {
		return false
	}
	if (!isQuoteTokenPurpose(o.purpose)) {
		return false
	}
	if (typeof o.exp !== 'number' || !Number.isFinite(o.exp)) {
		return false
	}
	return true
}

function requireCachedSigningKey(): string {
	if (cachedQuoteLinkSigningKey === undefined) {
		// Instrumentation can be skipped or run after first server action in some dev setups —
		// apply the same env / dev-fallback rules lazily.
		registerQuoteLinkSigningKeyFromEnvInInstrumentation()
	}
	if (cachedQuoteLinkSigningKey === undefined) {
		throw new Error(
			'Quote link signing is not available (e.g. static export / build phase, or misconfigured env). In production set QUOTE_LINK_SIGNING_KEY (≥32 UTF-8 bytes). See docs/environment-vars.md.',
		)
	}
	return cachedQuoteLinkSigningKey
}

/**
 * Shared HMAC secret for stateless deep links (Epic **14** quote tokens, Epic **15** / **15B.2** rider track).
 * @see {@link initQuoteLinkSigningKeyAtStartup}
 */
export function signingKeyMaterialForQuoteAndTrackLinks(): string {
	return requireCachedSigningKey()
}

/**
 * Reads **`QUOTE_LINK_SIGNING_KEY`** from the environment (UTF-8 string, **trimmed**), requires
 * **`Buffer.byteLength(trimmed, 'utf8') >= 32`**, and caches the trimmed value for HMAC.
 * Intended for **`instrumentation.ts`** on the Node server runtime only.
 *
 * The value is **not** base64-decoded; use a raw secret of at least 32 UTF-8 bytes (parity with
 * **`DISPATCH_OVERRIDE_SECRET`** style configuration).
 */
export function initQuoteLinkSigningKeyAtStartup(): void {
	const raw = process.env.QUOTE_LINK_SIGNING_KEY
	if (raw === undefined || raw === null) {
		throw new Error('QUOTE_LINK_SIGNING_KEY is required but was not set.')
	}
	const trimmed = raw.trim()
	if (Buffer.byteLength(trimmed, 'utf8') < 32) {
		throw new Error(
			'QUOTE_LINK_SIGNING_KEY must be at least 32 UTF-8 bytes after trimming (see docs/environment-vars.md).',
		)
	}
	cachedQuoteLinkSigningKey = trimmed
}

/**
 * Entry point for **`instrumentation.ts`**.
 *
 * - **Next compile / export:** when `NEXT_PHASE` is **`phase-production-build`** or **`phase-export`**
 *   (defence in depth; Next often skips loading instrumentation during production build), **no-op**
 *   so builds do not require **`QUOTE_LINK_SIGNING_KEY`** when the compile graph never touches token code.
 * - **Production runtime** (`NODE_ENV === 'production'` outside those phases): **requires** a
 *   valid **`QUOTE_LINK_SIGNING_KEY`** — delegates to **`initQuoteLinkSigningKeyAtStartup`** (fail-fast).
 * - **Non-production** (e.g. `next dev`): if the env var is **unset or blank**, installs a **fixed
 *   dev-only fallback** so quote / track signing works locally; emits **`console.warn`** once unless
 *   **`VESTROO_SUPPRESS_DEV_QUOTE_SIGNING_WARN`** is set. Set a real **`QUOTE_LINK_SIGNING_KEY`** in
 *   **`.env.local`** for staging parity and stable tokens across machines.
 */
export function registerQuoteLinkSigningKeyFromEnvInInstrumentation(): void {
	if (cachedQuoteLinkSigningKey !== undefined) {
		return
	}

	const phase = process.env.NEXT_PHASE
	if (phase === 'phase-production-build' || phase === 'phase-export') {
		return
	}

	const isProdRuntime = process.env.NODE_ENV === 'production'
	const trimmed = process.env.QUOTE_LINK_SIGNING_KEY?.trim() ?? ''
	const quietWarn =
		process.env.VITEST === 'true' ||
		process.env.NODE_ENV === 'test' ||
		process.env.VESTROO_SUPPRESS_DEV_QUOTE_SIGNING_WARN === '1'

	if (trimmed.length > 0) {
		try {
			initQuoteLinkSigningKeyAtStartup()
			return
		} catch (err) {
			if (isProdRuntime) {
				throw err
			}
			if (!quietWarn) {
				const msg = err instanceof Error ? err.message : String(err)
				console.warn(
					`[vestroo] QUOTE_LINK_SIGNING_KEY is set but invalid (${msg}). Using built-in dev-only signing key.`,
				)
			}
			cachedQuoteLinkSigningKey = QUOTE_LINK_SIGNING_KEY_DEV_FALLBACK
			return
		}
	}

	if (isProdRuntime) {
		initQuoteLinkSigningKeyAtStartup()
		return
	}

	cachedQuoteLinkSigningKey = QUOTE_LINK_SIGNING_KEY_DEV_FALLBACK
	if (!quietWarn) {
		console.warn(
			'[vestroo] QUOTE_LINK_SIGNING_KEY is unset — using a built-in dev-only signing key so quote links work under `next dev`. Set QUOTE_LINK_SIGNING_KEY (≥32 UTF-8 bytes) in .env.local for production parity.',
		)
	}
}

/** @internal Used by Vitest to reset module state between cases. */
export function resetQuoteLinkSigningKeyForTests(): void {
	cachedQuoteLinkSigningKey = undefined
}

/** Mint a token for **`purpose`** with the same **`quoteId` / `bookingId` / `exp`** as an existing reject/accept payload (Epic 14 “Actually, I’ll accept”). */
export function signQuoteTokenWithPurpose(
	base: Pick<QuoteTokenPayload, 'quoteId' | 'bookingId' | 'exp'>,
	purpose: QuoteTokenPurpose,
): string {
	return signQuoteToken({ ...base, purpose })
}

export function signQuoteToken(payload: QuoteTokenPayload): string {
	if (!assertPayloadShape(payload)) {
		throw new Error('Invalid quote token payload.')
	}
	const secret = requireCachedSigningKey()
	const body = Buffer.from(canonicalPayloadJson(payload), 'utf8')
	const sig = createHmac('sha256', secret).update(body).digest()
	return Buffer.concat([body, sig]).toString('base64url')
}

export function verifyQuoteToken(
	token: string,
	options?: VerifyQuoteTokenOptions,
): VerifyQuoteTokenResult {
	const secret = requireCachedSigningKey()
	if (token.length === 0) {
		return { valid: false, reason: 'malformed' }
	}
	let raw: Buffer
	try {
		raw = Buffer.from(token, 'base64url')
	} catch {
		return { valid: false, reason: 'malformed' }
	}
	if (raw.length <= 32) {
		return { valid: false, reason: 'malformed' }
	}
	const sig = raw.subarray(raw.length - 32)
	const bodyBuf = raw.subarray(0, raw.length - 32)
	const expectedMac = createHmac('sha256', secret).update(bodyBuf).digest()
	if (sig.length !== expectedMac.length || !timingSafeEqual(sig, expectedMac)) {
		return { valid: false, reason: 'invalid_signature' }
	}
	let parsed: unknown
	try {
		parsed = JSON.parse(bodyBuf.toString('utf8')) as unknown
	} catch {
		return { valid: false, reason: 'malformed' }
	}
	if (!assertPayloadShape(parsed)) {
		return { valid: false, reason: 'malformed' }
	}
	const payload = parsed
	if (payload.exp <= Date.now()) {
		return { valid: false, reason: 'expired', payload }
	}
	if (options?.expectedPurpose !== undefined && options.expectedPurpose !== payload.purpose) {
		return { valid: false, reason: 'malformed' }
	}
	return { valid: true, payload }
}
