import { NextResponse, type NextRequest } from 'next/server'

import {
	isOpsPasswordSetupAuthType,
	opsAuthNextPath,
	toEmailOtpType,
} from '@/lib/ops-auth-callback'
import { createUserServerClient } from '@/lib/supabase/server'

function redirectToLoginWithError(request: NextRequest, message: string): NextResponse {
	const url = new URL('/ops/login', request.url)
	url.searchParams.set('auth_error', message)
	return NextResponse.redirect(url)
}

function redirectAfterAuth(
	request: NextRequest,
	type: string | null,
	next: string | null,
): NextResponse {
	const path = isOpsPasswordSetupAuthType(type)
		? '/ops/auth/set-password'
		: opsAuthNextPath(next)
	return NextResponse.redirect(new URL(path, request.url))
}

/**
 * Verifies invite/recovery tokens server-side (sets auth cookies), then redirects.
 * Implicit-flow hash tokens are handled by `/ops/auth/callback/hash` (rewrite below).
 */
export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl
	const tokenHash = searchParams.get('token_hash')
	const code = searchParams.get('code')
	const type = searchParams.get('type')
	const next = searchParams.get('next')

	if (tokenHash) {
		const otpType = type ? toEmailOtpType(type) : null
		if (!otpType) {
			return redirectToLoginWithError(request, 'This invitation link is invalid. Request a new invite.')
		}

		const supabase = await createUserServerClient()
		const { error } = await supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type: otpType,
		})
		if (error) {
			return redirectToLoginWithError(request, error.message)
		}

		return redirectAfterAuth(request, type, next)
	}

	if (code) {
		const supabase = await createUserServerClient()
		const { error } = await supabase.auth.exchangeCodeForSession(code)
		if (error) {
			return redirectToLoginWithError(request, error.message)
		}

		return redirectAfterAuth(request, type, next)
	}

	return NextResponse.rewrite(new URL('/ops/auth/callback/hash', request.url))
}
