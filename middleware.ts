import { type NextRequest, NextResponse } from 'next/server'

import { OPS_BOOKING_ASSIGN_ANCHOR_ID, OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import { buildOpsFulfilLegacyRedirectToBookingsUrl } from '@/lib/ops-fulfil-legacy-redirect'
import { remapLegacyOpsSearchToBookingsHref } from '@/lib/ops-booking-grid-query'
import { refreshSupabaseSessionCookie } from '@/lib/supabase/middleware'

const REMOVED_OPS_PATHS = new Set([
	'/ops/compliance',
	'/ops/compliance/',
	'/ops/comms',
	'/ops/comms/',
	'/ops/reports/suggestions',
	'/ops/reports/suggestions/',
	'/ops/board',
	'/ops/board/',
	'/ops/settings/service-runs',
	'/ops/settings/service-runs/',
])

function redirectResponse(request: NextRequest, dest: URL): NextResponse {
	return NextResponse.redirect(dest, 302)
}

export async function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname

	if (REMOVED_OPS_PATHS.has(pathname)) {
		const response = redirectResponse(request, new URL('/ops', request.nextUrl.origin))
		await refreshSupabaseSessionCookie(request, response)
		return response
	}

	if (pathname === '/ops/search' || pathname === '/ops/search/') {
		const raw: Record<string, string | string[] | undefined> = {}
		request.nextUrl.searchParams.forEach((value, key) => {
			raw[key] = value
		})
		const dest = new URL(remapLegacyOpsSearchToBookingsHref(raw), request.nextUrl.origin)
		const response = redirectResponse(request, dest)
		await refreshSupabaseSessionCookie(request, response)
		return response
	}

	if (pathname === '/ops/fulfil' || pathname === '/ops/fulfil/') {
		const dest = buildOpsFulfilLegacyRedirectToBookingsUrl(request.nextUrl)
		const response = redirectResponse(request, dest)
		await refreshSupabaseSessionCookie(request, response)
		return response
	}

	const assignLegacyMatch = /^\/ops\/bookings\/([^/]+)\/assign\/?$/.exec(pathname)
	if (assignLegacyMatch) {
		const bid = assignLegacyMatch[1] ?? ''
		const dest = new URL(
			`/ops/bookings/${encodeURIComponent(bid)}#${OPS_BOOKING_ASSIGN_ANCHOR_ID}`,
			request.nextUrl.origin,
		)
		const response = redirectResponse(request, dest)
		await refreshSupabaseSessionCookie(request, response)
		return response
	}

	if (pathname.startsWith('/ops/close-protection')) {
		const dest = new URL(OPS_BOOKINGS_PATH, request.nextUrl.origin)
		const response = redirectResponse(request, dest)
		await refreshSupabaseSessionCookie(request, response)
		return response
	}

	if (pathname === '/services/close-protection' || pathname === '/services/close-protection/') {
		const dest = new URL('/contact', request.nextUrl.origin)
		const response = redirectResponse(request, dest)
		await refreshSupabaseSessionCookie(request, response)
		return response
	}

	if (
		pathname.startsWith('/ops') ||
		pathname.startsWith('/field') ||
		pathname.startsWith('/account')
	) {
		const requestHeaders = new Headers(request.headers)
		const pathWithSearch = pathname + (request.nextUrl.search ?? '')
		requestHeaders.set('x-pathname', pathWithSearch)

		const response = NextResponse.next({
			request: { headers: requestHeaders },
		})

		await refreshSupabaseSessionCookie(request, response)
		return response
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
