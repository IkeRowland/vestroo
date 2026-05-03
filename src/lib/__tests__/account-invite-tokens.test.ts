import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import {
	accountInviteExpiryMs,
	mintAccountInviteJti,
	resetAccountInviteSigningKeyForTests,
	signAccountInviteToken,
	verifyAccountInviteToken,
} from '@/lib/account-invite-tokens'

describe('account-invite-tokens', () => {
	const prevInvite = process.env.VESTROO_ACCOUNT_INVITE_SIGNING_KEY
	const prevQuote = process.env.QUOTE_LINK_SIGNING_KEY

	beforeEach(() => {
		resetAccountInviteSigningKeyForTests()
		process.env.VESTROO_ACCOUNT_INVITE_SIGNING_KEY = 'x'.repeat(32)
		delete process.env.QUOTE_LINK_SIGNING_KEY
	})

	afterEach(() => {
		resetAccountInviteSigningKeyForTests()
		if (prevInvite === undefined) delete process.env.VESTROO_ACCOUNT_INVITE_SIGNING_KEY
		else process.env.VESTROO_ACCOUNT_INVITE_SIGNING_KEY = prevInvite
		if (prevQuote === undefined) delete process.env.QUOTE_LINK_SIGNING_KEY
		else process.env.QUOTE_LINK_SIGNING_KEY = prevQuote
	})

	it('round-trips a signed invite token before expiry', () => {
		const exp = accountInviteExpiryMs(7)
		const payload = {
			accountId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
			email: 'invitee@example.com',
			jti: mintAccountInviteJti(),
			accountName: 'Acme Ltd',
			roleLabel: 'Booker',
			exp,
		}
		const token = signAccountInviteToken(payload)
		const v = verifyAccountInviteToken(token)
		expect(v.valid).toBe(true)
		if (v.valid) {
			expect(v.payload.accountId).toBe(payload.accountId)
			expect(v.payload.email).toBe(payload.email)
			expect(v.payload.jti).toBe(payload.jti)
		}
	})

	it('rejects expired tokens', () => {
		const payload = {
			accountId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
			email: 'invitee@example.com',
			jti: mintAccountInviteJti(),
			accountName: 'Acme Ltd',
			roleLabel: 'Booker',
			exp: Date.now() - 1000,
		}
		const token = signAccountInviteToken(payload)
		const v = verifyAccountInviteToken(token)
		expect(v.valid).toBe(false)
		if (!v.valid) expect(v.reason).toBe('expired')
	})
})
