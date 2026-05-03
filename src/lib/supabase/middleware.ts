import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Ensures the Supabase auth cookie is refreshed (if needed) before RSC runs.
 * Call once per request; `response` is the same `NextResponse.next(...)` you return.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function refreshSupabaseSessionCookie(
	request: NextRequest,
	response: NextResponse,
): Promise<void> {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseAnonKey) {
		return
	}

	const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll()
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					response.cookies.set(name, value, options)
				})
			},
		},
	})

	await supabase.auth.getUser()
}
