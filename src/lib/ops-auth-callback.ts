import type { EmailOtpType } from '@supabase/supabase-js'

import { absoluteUrl } from '@/lib/site-url'

/** Canonical Supabase `redirectTo` for ops team invite / recovery links. */
export function opsAuthCallbackUrl(): string {
	return absoluteUrl('/ops/auth/callback')
}

/**
 * `redirectTo` with `type` preserved for PKCE / query-based returns (hash flow includes `type` separately).
 */
export function opsAuthCallbackUrlWithType(authType: 'invite' | 'recovery'): string {
	const url = new URL(opsAuthCallbackUrl())
	url.searchParams.set('type', authType)
	return url.toString()
}

/**
 * Direct accept URL for ops team invite emails (uses `hashed_token` from `generateLink`, not `action_link`).
 * Server route `/ops/auth/callback` verifies OTP and sets session cookies.
 */
export function buildOpsTeamInviteAcceptUrl(
	hashedToken: string,
	authType: 'invite' | 'recovery',
): string {
	const url = new URL(opsAuthCallbackUrl())
	url.searchParams.set('token_hash', hashedToken)
	url.searchParams.set('type', authType)
	return url.toString()
}

export function parseAuthHashParams(hash: string): URLSearchParams {
	const raw = hash.startsWith('#') ? hash.slice(1) : hash
	return new URLSearchParams(raw)
}

export function opsAuthNextPath(next: string | null): string {
	return next && next.startsWith('/ops') ? next : '/ops'
}

/** Auth flows that must set a password before using the ops console. */
export function isOpsPasswordSetupAuthType(type: string | null | undefined): boolean {
	return type === 'invite' || type === 'recovery' || type === 'signup'
}

const VERIFY_OTP_TYPES = new Set<string>([
	'invite',
	'recovery',
	'signup',
	'magiclink',
	'email',
	'email_change',
])

export function toEmailOtpType(type: string): EmailOtpType | null {
	if (!VERIFY_OTP_TYPES.has(type)) return null
	return type as EmailOtpType
}

export function hashHasImplicitSessionTokens(hash: string): boolean {
	return hash.length > 1 && hash.includes('access_token')
}
