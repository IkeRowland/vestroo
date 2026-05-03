import { createHmac } from 'crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
	initQuoteLinkSigningKeyAtStartup,
	resetQuoteLinkSigningKeyForTests,
} from '@/lib/quote-tokens'
import {
	riderTrackTokenExpMsFromTripEndEstimateIso,
	signRiderTrackToken,
	verifyRiderTrackToken,
	type RiderTrackTokenPayload,
} from '@/lib/tracking-tokens'

const TEST_SECRET = '0123456789abcdef0123456789abcdef'

describe('tracking-tokens (rider_track)', () => {
	beforeEach(() => {
		process.env.QUOTE_LINK_SIGNING_KEY = TEST_SECRET
		resetQuoteLinkSigningKeyForTests()
		initQuoteLinkSigningKeyAtStartup()
	})

	afterEach(() => {
		delete process.env.QUOTE_LINK_SIGNING_KEY
		resetQuoteLinkSigningKeyForTests()
	})

	it('round-trips sign → verify with expectedPurpose', () => {
		const payload: RiderTrackTokenPayload = {
			trip_id: 't0000000-0000-4000-8000-000000000001',
			purpose: 'rider_track',
			exp: Date.now() + 120_000,
		}
		const token = signRiderTrackToken(payload)
		const v = verifyRiderTrackToken(token, { expectedPurpose: 'rider_track' })
		expect(v.valid).toBe(true)
		if (v.valid) {
			expect(v.payload).toEqual(payload)
		}
	})

	it('rejects expired token', () => {
		const payload: RiderTrackTokenPayload = {
			trip_id: 't0000000-0000-4000-8000-000000000001',
			purpose: 'rider_track',
			exp: Date.now() - 1000,
		}
		const token = signRiderTrackToken(payload)
		const v = verifyRiderTrackToken(token)
		expect(v.valid).toBe(false)
		if (!v.valid) {
			expect(v.reason).toBe('expired')
			expect(v.payload?.trip_id).toBe(payload.trip_id)
		}
	})

	it('rejects tampered MAC', () => {
		const payload: RiderTrackTokenPayload = {
			trip_id: 't0000000-0000-4000-8000-000000000001',
			purpose: 'rider_track',
			exp: Date.now() + 120_000,
		}
		const token = signRiderTrackToken(payload)
		const raw = Buffer.from(token, 'base64url')
		raw[0] ^= 0xff
		expect(verifyRiderTrackToken(raw.toString('base64url'))).toEqual({
			valid: false,
			reason: 'invalid_signature',
		})
	})

	it('rejects malformed body JSON (wrong purpose string in payload)', () => {
		const body = Buffer.from(
			JSON.stringify({
				trip_id: 't0000000-0000-4000-8000-000000000001',
				purpose: 'other',
				exp: Date.now() + 120_000,
			}),
			'utf8',
		)
		const sig = createHmac('sha256', TEST_SECRET).update(body).digest()
		const token = Buffer.concat([body, sig]).toString('base64url')
		expect(verifyRiderTrackToken(token)).toEqual({ valid: false, reason: 'malformed' })
	})

	it('riderTrackTokenExpMsFromTripEndEstimateIso adds two hours', () => {
		const iso = '2026-06-01T10:00:00.000Z'
		const exp = riderTrackTokenExpMsFromTripEndEstimateIso(iso)
		expect(exp).toBe(new Date(iso).getTime() + 2 * 60 * 60 * 1000)
	})

	it('rejects short / garbage base64url without initializing signing key (15B.7 / dev UX)', () => {
		resetQuoteLinkSigningKeyForTests()
		delete process.env.QUOTE_LINK_SIGNING_KEY
		expect(verifyRiderTrackToken('')).toEqual({ valid: false, reason: 'malformed' })
		expect(verifyRiderTrackToken('invalid.invalid.invalid')).toEqual({ valid: false, reason: 'malformed' })
	})
})
