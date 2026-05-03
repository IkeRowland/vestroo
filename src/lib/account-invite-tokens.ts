import { createHmac, randomUUID, timingSafeEqual } from 'crypto'

/**
 * HMAC-signed invite deep-link (Epic 15 / 15A.6), same wire shape as `quote-tokens.ts`
 * (canonical JSON body + SHA-256 HMAC, base64url).
 *
 * **TTL:** `exp` is UTC epoch **milliseconds**; server also stores `invite_expires_at` on the row.
 * **Single-use wave:** `jti` must match `customer_account_members.invite_token_jti` (rotated on resend).
 */

export type AccountInviteTokenPayload = {
	accountId: string
	/** Normalised lower-case email (stable key). */
	email: string
	/** Invite wave id stored on the member row. */
	jti: string
	/** Organisation display name at send time (for public landing; not secret). */
	accountName: string
	/** Role label for copy (e.g. "Admin"). */
	roleLabel: string
	/** Expiry instant as UTC epoch milliseconds. */
	exp: number
}

export type VerifyAccountInviteTokenOk = { valid: true; payload: AccountInviteTokenPayload }

export type VerifyAccountInviteTokenFail = {
	valid: false
	reason: 'expired' | 'invalid_signature' | 'malformed'
	payload?: AccountInviteTokenPayload
}

export type VerifyAccountInviteTokenResult = VerifyAccountInviteTokenOk | VerifyAccountInviteTokenFail

let cachedSigningKey: string | undefined

function assertPayloadShape(data: unknown): data is AccountInviteTokenPayload {
	if (typeof data !== 'object' || data === null) return false
	const o = data as Record<string, unknown>
	if (typeof o.accountId !== 'string' || o.accountId.length === 0) return false
	if (typeof o.email !== 'string' || o.email.length === 0) return false
	if (typeof o.jti !== 'string' || o.jti.length === 0) return false
	if (typeof o.accountName !== 'string') return false
	if (typeof o.roleLabel !== 'string') return false
	if (typeof o.exp !== 'number' || !Number.isFinite(o.exp)) return false
	return true
}

function canonicalPayloadJson(payload: AccountInviteTokenPayload): string {
	return JSON.stringify({
		accountId: payload.accountId,
		email: payload.email,
		jti: payload.jti,
		accountName: payload.accountName,
		roleLabel: payload.roleLabel,
		exp: payload.exp,
	})
}

function requireSigningKey(): string {
	if (cachedSigningKey === undefined) {
		const raw =
			process.env.VESTROO_ACCOUNT_INVITE_SIGNING_KEY?.trim() ||
			process.env.QUOTE_LINK_SIGNING_KEY?.trim() ||
			''
		if (raw.length === 0) {
			throw new Error(
				'Account invite signing is not configured. Set VESTROO_ACCOUNT_INVITE_SIGNING_KEY (preferred) or QUOTE_LINK_SIGNING_KEY — UTF-8, at least 32 bytes after trim.',
			)
		}
		if (Buffer.byteLength(raw, 'utf8') < 32) {
			throw new Error('Account invite signing key must be at least 32 UTF-8 bytes after trim.')
		}
		cachedSigningKey = raw
	}
	return cachedSigningKey
}

/**
 * Same bootstrap rules as quote tokens: skip during Next production build/export phases.
 */
export function registerAccountInviteSigningKeyFromEnvInInstrumentation(): void {
	const phase = process.env.NEXT_PHASE
	if (phase === 'phase-production-build' || phase === 'phase-export') {
		return
	}
	const isProdRuntime = process.env.NODE_ENV === 'production'
	const raw =
		process.env.VESTROO_ACCOUNT_INVITE_SIGNING_KEY?.trim() ||
		process.env.QUOTE_LINK_SIGNING_KEY?.trim() ||
		''
	if (raw.length === 0) {
		if (isProdRuntime) {
			requireSigningKey()
		}
		return
	}
	cachedSigningKey = raw
	if (Buffer.byteLength(cachedSigningKey, 'utf8') < 32) {
		throw new Error('VESTROO_ACCOUNT_INVITE_SIGNING_KEY / QUOTE_LINK_SIGNING_KEY must be ≥ 32 UTF-8 bytes.')
	}
}

/** @internal */
export function resetAccountInviteSigningKeyForTests(): void {
	cachedSigningKey = undefined
}

export function mintAccountInviteJti(): string {
	return randomUUID()
}

export function accountInviteExpiryMs(ttlDays: number): number {
	const d = Math.max(1, Math.min(ttlDays, 30))
	return Date.now() + d * 24 * 60 * 60 * 1000
}

export function signAccountInviteToken(payload: AccountInviteTokenPayload): string {
	if (!assertPayloadShape(payload)) {
		throw new Error('Invalid account invite token payload.')
	}
	const secret = requireSigningKey()
	const body = Buffer.from(canonicalPayloadJson(payload), 'utf8')
	const sig = createHmac('sha256', secret).update(body).digest()
	return Buffer.concat([body, sig]).toString('base64url')
}

export function verifyAccountInviteToken(token: string): VerifyAccountInviteTokenResult {
	let secret: string
	try {
		secret = requireSigningKey()
	} catch {
		return { valid: false, reason: 'malformed' }
	}
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
	return { valid: true, payload }
}
