import { NextRequest, NextResponse } from 'next/server'

/**
 * Epic 16 Theme N — 90-day deprecation — delete after 2026-07-25.
 * Legacy PayFast-era `/q/[token]/pay` bookmarks/emails → `/q/[token]/accept` (EFT landing, US-N7 / Q33).
 * Redirect is path-only on the request origin (no hardcoded host, no query reflection).
 */
type RouteContext = {
	params: Promise<{ token: string }>
}

export async function GET(
	request: NextRequest,
	context: RouteContext,
): Promise<NextResponse> {
	const { token } = await context.params
	const target = new URL(`/q/${token}/accept`, request.url)
	return NextResponse.redirect(target, 302)
}
