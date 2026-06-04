import { describe, expect, it } from 'vitest'

import {
	buildOpsTeamInviteAcceptUrl,
	hashHasImplicitSessionTokens,
	isOpsPasswordSetupAuthType,
	opsAuthNextPath,
	parseAuthHashParams,
	toEmailOtpType,
} from '@/lib/ops-auth-callback'

describe('ops-auth-callback', () => {
	it('parseAuthHashParams reads hash fragment', () => {
		const params = parseAuthHashParams('#access_token=a&refresh_token=b&type=invite')
		expect(params.get('access_token')).toBe('a')
		expect(params.get('type')).toBe('invite')
	})

	it('isOpsPasswordSetupAuthType covers invite flows', () => {
		expect(isOpsPasswordSetupAuthType('invite')).toBe(true)
		expect(isOpsPasswordSetupAuthType('recovery')).toBe(true)
		expect(isOpsPasswordSetupAuthType('signup')).toBe(true)
		expect(isOpsPasswordSetupAuthType('magiclink')).toBe(false)
	})

	it('opsAuthNextPath restricts external redirects', () => {
		expect(opsAuthNextPath('/ops/team')).toBe('/ops/team')
		expect(opsAuthNextPath('https://evil.com')).toBe('/ops')
		expect(opsAuthNextPath(null)).toBe('/ops')
	})

	it('hashHasImplicitSessionTokens detects implicit flow', () => {
		expect(hashHasImplicitSessionTokens('#access_token=x')).toBe(true)
		expect(hashHasImplicitSessionTokens('')).toBe(false)
	})

	it('toEmailOtpType validates supported types', () => {
		expect(toEmailOtpType('invite')).toBe('invite')
		expect(toEmailOtpType('not-a-type')).toBeNull()
	})

	it('buildOpsTeamInviteAcceptUrl embeds token_hash and type', () => {
		const url = new URL(buildOpsTeamInviteAcceptUrl('abc123', 'invite'))
		expect(url.pathname).toBe('/ops/auth/callback')
		expect(url.searchParams.get('token_hash')).toBe('abc123')
		expect(url.searchParams.get('type')).toBe('invite')
	})
})
