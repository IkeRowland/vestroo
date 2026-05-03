import { createHmac, timingSafeEqual } from 'crypto'

import type { CanDispatchAccountBookingReasonDb } from '@/types/database.types'

export const DISPATCH_OVERRIDE_TTL_MS = 15 * 60 * 1000

export type DispatchOverridePayloadV1 = {
	v: 1
	booking_id: string
	reason_code: Extract<
		CanDispatchAccountBookingReasonDb,
		'credit_limit_exceeded' | 'overdue_invoices'
	>
	override_reason: string
	/** Profile id of the admin who signed this token (must match caller on assign). */
	profile_id: string
	exp: number
}

export function getDispatchOverrideSecret(): string | null {
	const raw = process.env.DISPATCH_OVERRIDE_SECRET?.trim()
	if (!raw || raw.length < 32) {
		return null
	}
	return raw
}

/**
 * HMAC-SHA256 over JSON body (v1). Short TTL; admin-only issuance; bind `profile_id` to the caller.
 */
export function encodeDispatchOverrideToken(payload: DispatchOverridePayloadV1, secret: string): string {
	const body = Buffer.from(JSON.stringify(payload), 'utf8')
	const sig = createHmac('sha256', secret).update(body).digest()
	return Buffer.concat([body, sig]).toString('base64url')
}

export type VerifyDispatchOverrideTokenOk = { ok: true; payload: DispatchOverridePayloadV1 }

export type VerifyDispatchOverrideTokenFail = { ok: false; error: string }

export function verifyDispatchOverrideToken(
	token: string,
	secret: string,
): VerifyDispatchOverrideTokenOk | VerifyDispatchOverrideTokenFail {
	try {
		const raw = Buffer.from(token, 'base64url')
		if (raw.length < 33) {
			return { ok: false, error: 'invalid' }
		}
		const sig = raw.subarray(raw.length - 32)
		const bodyBuf = raw.subarray(0, raw.length - 32)
		const expected = createHmac('sha256', secret).update(bodyBuf).digest()
		if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
			return { ok: false, error: 'signature' }
		}
		const payload = JSON.parse(bodyBuf.toString('utf8')) as DispatchOverridePayloadV1
		if (payload.v !== 1 || typeof payload.booking_id !== 'string') {
			return { ok: false, error: 'payload' }
		}
		if (payload.reason_code !== 'credit_limit_exceeded' && payload.reason_code !== 'overdue_invoices') {
			return { ok: false, error: 'reason' }
		}
		if (typeof payload.override_reason !== 'string' || payload.override_reason.length < 10) {
			return { ok: false, error: 'reason_len' }
		}
		if (payload.override_reason.length > 2000) {
			return { ok: false, error: 'reason_len' }
		}
		if (typeof payload.profile_id !== 'string' || !payload.profile_id) {
			return { ok: false, error: 'profile' }
		}
		if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
			return { ok: false, error: 'expired' }
		}
		return { ok: true, payload }
	} catch {
		return { ok: false, error: 'parse' }
	}
}

export function isOverridableAccountDispatchReason(reasonCode: string): boolean {
	return reasonCode === 'credit_limit_exceeded' || reasonCode === 'overdue_invoices'
}
