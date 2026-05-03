import { createHmac, timingSafeEqual } from 'crypto'

import { signingKeyMaterialForQuoteAndTrackLinks } from '@/lib/quote-tokens'

/**
 * Stateless rider tracking deep-link payload (Epic **15** / **15B.2** — US-C1).
 *
 * **`exp`:** UTC epoch **milliseconds**. **15B.2** normative rule: `time_end_estimate + 2 hours`
 * (see `riderTrackTokenExpMsFromTripEndEstimateIso`).
 */
export type RiderTrackTokenPayload = {
	trip_id: string
	purpose: 'rider_track'
	exp: number
}

export type VerifyRiderTrackTokenOptions = {
	expectedPurpose?: 'rider_track'
}

export type VerifyRiderTrackTokenOk = { valid: true; payload: RiderTrackTokenPayload }

export type VerifyRiderTrackTokenFail = {
	valid: false
	reason: 'expired' | 'invalid_signature' | 'malformed'
	payload?: RiderTrackTokenPayload
}

export type VerifyRiderTrackTokenResult = VerifyRiderTrackTokenOk | VerifyRiderTrackTokenFail

/** US-C1 (15B.2): token `exp` = trip `time_end_estimate` + 2 hours (UTC ms). */
export function riderTrackTokenExpMsFromTripEndEstimateIso(timeEndEstimateIso: string): number {
	const t = new Date(timeEndEstimateIso).getTime()
	if (Number.isNaN(t)) {
		throw new Error('Invalid time_end_estimate for rider track token')
	}
	return t + 2 * 60 * 60 * 1000
}

function canonicalPayloadJson(payload: RiderTrackTokenPayload): string {
	return JSON.stringify({
		trip_id: payload.trip_id,
		purpose: payload.purpose,
		exp: payload.exp,
	})
}

function assertPayloadShape(data: unknown): data is RiderTrackTokenPayload {
	if (typeof data !== 'object' || data === null) {
		return false
	}
	const o = data as Record<string, unknown>
	if (typeof o.trip_id !== 'string' || o.trip_id.length === 0) {
		return false
	}
	if (o.purpose !== 'rider_track') {
		return false
	}
	if (typeof o.exp !== 'number' || !Number.isFinite(o.exp)) {
		return false
	}
	return true
}

export function signRiderTrackToken(payload: RiderTrackTokenPayload): string {
	if (!assertPayloadShape(payload)) {
		throw new Error('Invalid rider track token payload.')
	}
	const secret = signingKeyMaterialForQuoteAndTrackLinks()
	const body = Buffer.from(canonicalPayloadJson(payload), 'utf8')
	const sig = createHmac('sha256', secret).update(body).digest()
	return Buffer.concat([body, sig]).toString('base64url')
}

export function verifyRiderTrackToken(
	token: string,
	options?: VerifyRiderTrackTokenOptions,
): VerifyRiderTrackTokenResult {
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
		/** Malformed / truncated — no HMAC yet, so **`QUOTE_LINK_SIGNING_KEY`** is not required (dev + 15B.7 E2E). */
		return { valid: false, reason: 'malformed' }
	}
	const secret = signingKeyMaterialForQuoteAndTrackLinks()
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
