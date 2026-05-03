import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	initQuoteLinkSigningKeyAtStartup,
	quoteTokenExpiryMsFromExpiresAtIso,
	registerQuoteLinkSigningKeyFromEnvInInstrumentation,
	resetQuoteLinkSigningKeyForTests,
	signQuoteToken,
	verifyQuoteToken,
	type QuoteTokenPayload,
} from '@/lib/quote-tokens'

const TEST_SECRET = '0123456789abcdef0123456789abcdef'

function assertNoTestSecretInError(err: unknown, testSecret: string): void {
	const full = String(err)
	expect(full).not.toContain(testSecret)
	if (err instanceof Error) {
		expect(err.message).not.toContain(testSecret)
	}
}

describe('quote-tokens', () => {
	beforeEach(() => {
		process.env.QUOTE_LINK_SIGNING_KEY = TEST_SECRET
		resetQuoteLinkSigningKeyForTests()
		initQuoteLinkSigningKeyAtStartup()
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		delete process.env.QUOTE_LINK_SIGNING_KEY
		delete process.env.NEXT_PHASE
		resetQuoteLinkSigningKeyForTests()
	})

	it('(1) round-trips sign → verify when expectedPurpose matches', () => {
		const payload: QuoteTokenPayload = {
			quoteId: 'q0000000-0000-4000-8000-000000000001',
			bookingId: 'b0000000-0000-4000-8000-000000000002',
			purpose: 'accept',
			exp: Date.now() + 60_000,
		}
		const token = signQuoteToken(payload)
		const v = verifyQuoteToken(token, { expectedPurpose: 'accept' })
		expect(v.valid).toBe(true)
		if (v.valid) {
			expect(v.payload).toEqual(payload)
		}
	})

	it('(2) rejects expired token (exp in the past) with reason expired', () => {
		const payload: QuoteTokenPayload = {
			quoteId: 'q0000000-0000-4000-8000-000000000001',
			bookingId: 'b0000000-0000-4000-8000-000000000002',
			purpose: 'pay',
			exp: Date.now() - 1000,
		}
		const token = signQuoteToken(payload)
		const v = verifyQuoteToken(token)
		expect(v.valid).toBe(false)
		if (!v.valid) {
			expect(v.reason).toBe('expired')
			expect(v.payload?.quoteId).toBe(payload.quoteId)
		}
	})

	it('(3) rejects tampered payload bytes (MAC no longer matches)', () => {
		const payload: QuoteTokenPayload = {
			quoteId: 'q0000000-0000-4000-8000-000000000001',
			bookingId: 'b0000000-0000-4000-8000-000000000002',
			purpose: 'reject',
			exp: Date.now() + 60_000,
		}
		const token = signQuoteToken(payload)
		const raw = Buffer.from(token, 'base64url')
		raw[0] ^= 0xff
		const broken = raw.toString('base64url')
		expect(verifyQuoteToken(broken)).toEqual({ valid: false, reason: 'invalid_signature' })
	})

	it('(4) rejects tampered signature segment', () => {
		const payload: QuoteTokenPayload = {
			quoteId: 'q0000000-0000-4000-8000-000000000001',
			bookingId: 'b0000000-0000-4000-8000-000000000002',
			purpose: 'accept',
			exp: Date.now() + 60_000,
		}
		const token = signQuoteToken(payload)
		const raw = Buffer.from(token, 'base64url')
		raw[raw.length - 1] ^= 0xff
		const broken = raw.toString('base64url')
		expect(verifyQuoteToken(broken)).toEqual({ valid: false, reason: 'invalid_signature' })
	})

	it('(5) rejects truncated token string', () => {
		const payload: QuoteTokenPayload = {
			quoteId: 'q0000000-0000-4000-8000-000000000001',
			bookingId: 'b0000000-0000-4000-8000-000000000002',
			purpose: 'pay',
			exp: Date.now() + 60_000,
		}
		const token = signQuoteToken(payload)
		expect(verifyQuoteToken(token.slice(0, 8))).toEqual({ valid: false, reason: 'malformed' })
	})

	it('(6) rejects empty token string', () => {
		expect(verifyQuoteToken('')).toEqual({ valid: false, reason: 'malformed' })
	})

	it('(7a) quoteTokenExpiryMsFromExpiresAtIso rounds to whole seconds for verify parity', () => {
		const iso = '2026-05-01T10:00:00.400Z'
		const exp = quoteTokenExpiryMsFromExpiresAtIso(iso)
		expect(exp % 1000).toBe(0)
		const token = signQuoteToken({
			quoteId: 'q0000000-0000-4000-8000-000000000001',
			bookingId: 'b0000000-0000-4000-8000-000000000002',
			purpose: 'accept',
			exp,
		})
		const v = verifyQuoteToken(token, { expectedPurpose: 'accept' })
		expect(v.valid).toBe(true)
	})

	it('(7) rejects wrong purpose when expectedPurpose is set (malformed)', () => {
		const payload: QuoteTokenPayload = {
			quoteId: 'q0000000-0000-4000-8000-000000000001',
			bookingId: 'b0000000-0000-4000-8000-000000000002',
			purpose: 'pay',
			exp: Date.now() + 60_000,
		}
		const token = signQuoteToken(payload)
		expect(verifyQuoteToken(token, { expectedPurpose: 'accept' })).toEqual({
			valid: false,
			reason: 'malformed',
		})
	})

	it('registerQuoteLinkSigningKeyFromEnvInInstrumentation skips when NEXT_PHASE is phase-production-build', () => {
		vi.stubEnv('NODE_ENV', 'production')
		delete process.env.QUOTE_LINK_SIGNING_KEY
		resetQuoteLinkSigningKeyForTests()
		vi.stubEnv('NEXT_PHASE', 'phase-production-build')
		expect(() => registerQuoteLinkSigningKeyFromEnvInInstrumentation()).not.toThrow()
		resetQuoteLinkSigningKeyForTests()
		try {
			signQuoteToken({
				quoteId: 'q0000000-0000-4000-8000-000000000001',
				bookingId: 'b0000000-0000-4000-8000-000000000002',
				purpose: 'accept',
				exp: Date.now() + 60_000,
			})
			expect.fail('expected throw')
		} catch (e) {
			assertNoTestSecretInError(e, TEST_SECRET)
			expect(String(e)).toMatch(/not available|misconfigured/i)
		}
	})

	it('registerQuoteLinkSigningKeyFromEnvInInstrumentation requires key in production when NEXT_PHASE unset', () => {
		vi.stubEnv('NODE_ENV', 'production')
		delete process.env.QUOTE_LINK_SIGNING_KEY
		resetQuoteLinkSigningKeyForTests()
		expect(() => registerQuoteLinkSigningKeyFromEnvInInstrumentation()).toThrow(
			/QUOTE_LINK_SIGNING_KEY is required/,
		)
	})

	it('registerQuoteLinkSigningKeyFromEnvInInstrumentation uses dev fallback when key is too short in development', () => {
		vi.stubEnv('NODE_ENV', 'development')
		process.env.QUOTE_LINK_SIGNING_KEY = 'too-short'
		resetQuoteLinkSigningKeyForTests()
		expect(() => registerQuoteLinkSigningKeyFromEnvInInstrumentation()).not.toThrow()
		const payload: QuoteTokenPayload = {
			quoteId: 'q0000000-0000-4000-8000-000000000001',
			bookingId: 'b0000000-0000-4000-8000-000000000002',
			purpose: 'accept',
			exp: Date.now() + 60_000,
		}
		const token = signQuoteToken(payload)
		expect(verifyQuoteToken(token, { expectedPurpose: 'accept' }).valid).toBe(true)
	})

	it('registerQuoteLinkSigningKeyFromEnvInInstrumentation uses dev fallback when key unset in development', () => {
		vi.stubEnv('NODE_ENV', 'development')
		delete process.env.QUOTE_LINK_SIGNING_KEY
		resetQuoteLinkSigningKeyForTests()
		expect(() => registerQuoteLinkSigningKeyFromEnvInInstrumentation()).not.toThrow()
		const payload: QuoteTokenPayload = {
			quoteId: 'q0000000-0000-4000-8000-000000000001',
			bookingId: 'b0000000-0000-4000-8000-000000000002',
			purpose: 'accept',
			exp: Date.now() + 60_000,
		}
		const token = signQuoteToken(payload)
		const v = verifyQuoteToken(token, { expectedPurpose: 'accept' })
		expect(v.valid).toBe(true)
		if (v.valid) {
			expect(v.payload).toEqual(payload)
		}
	})

	it('(AC9) never echoes the test secret in Error.message / String(err) for startup, sign, or verify', () => {
		resetQuoteLinkSigningKeyForTests()
		delete process.env.QUOTE_LINK_SIGNING_KEY
		try {
			initQuoteLinkSigningKeyAtStartup()
			expect.fail('expected throw')
		} catch (e) {
			assertNoTestSecretInError(e, TEST_SECRET)
		}

		process.env.QUOTE_LINK_SIGNING_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
		resetQuoteLinkSigningKeyForTests()
		try {
			initQuoteLinkSigningKeyAtStartup()
			expect.fail('expected throw')
		} catch (e) {
			assertNoTestSecretInError(e, TEST_SECRET)
		}

		// With lazy init, signing can reload from env unless we are in a Next build/export phase.
		process.env.QUOTE_LINK_SIGNING_KEY = TEST_SECRET
		initQuoteLinkSigningKeyAtStartup()
		resetQuoteLinkSigningKeyForTests()
		delete process.env.QUOTE_LINK_SIGNING_KEY
		vi.stubEnv('NEXT_PHASE', 'phase-production-build')
		try {
			signQuoteToken({
				quoteId: 'q0000000-0000-4000-8000-000000000001',
				bookingId: 'b0000000-0000-4000-8000-000000000002',
				purpose: 'accept',
				exp: Date.now() + 60_000,
			})
			expect.fail('expected throw')
		} catch (e) {
			assertNoTestSecretInError(e, TEST_SECRET)
		}

		process.env.QUOTE_LINK_SIGNING_KEY = TEST_SECRET
		initQuoteLinkSigningKeyAtStartup()
		resetQuoteLinkSigningKeyForTests()
		delete process.env.QUOTE_LINK_SIGNING_KEY
		vi.stubEnv('NEXT_PHASE', 'phase-production-build')
		try {
			verifyQuoteToken('x')
			expect.fail('expected throw')
		} catch (e) {
			assertNoTestSecretInError(e, TEST_SECRET)
		}
	})
})
