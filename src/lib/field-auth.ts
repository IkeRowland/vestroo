import { redirect } from 'next/navigation'

import { createUserServerClient } from '@/lib/supabase/server'
import type { ProfileRole } from '@/types/database.types'

export type ChauffeurSession = {
	userId: string
	role: Extract<ProfileRole, 'chauffeur'>
}

export async function getChauffeurSession(): Promise<ChauffeurSession | null> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user) return null

	const { data: profile, error: profileErr } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.maybeSingle()

	if (profileErr || !profile?.role) return null
	const role = profile.role as ProfileRole
	if (role !== 'chauffeur') return null

	return { userId: user.id, role }
}

/**
 * Server Components / layouts: unauthenticated → field login; authenticated but not chauffeur → unauthorized.
 */
export async function requireChauffeurPage(): Promise<ChauffeurSession> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user) {
		redirect('/field/login')
	}

	const { data: profile, error: profileErr } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.maybeSingle()

	if (profileErr || !profile?.role) {
		redirect('/field/unauthorized')
	}

	const role = profile.role as ProfileRole
	if (role !== 'chauffeur') {
		redirect('/field/unauthorized')
	}

	return { userId: user.id, role }
}

export type ChauffeurActionGate =
	| { ok: true; session: ChauffeurSession }
	| { ok: false; message: string }

/**
 * Server Actions: return an error result instead of redirecting (403-style message).
 */
export async function getChauffeurForAction(): Promise<ChauffeurActionGate> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user) {
		return { ok: false, message: 'Not authenticated' }
	}

	const { data: profile, error: profileErr } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.maybeSingle()

	if (profileErr || !profile?.role) {
		return { ok: false, message: 'Forbidden' }
	}

	const role = profile.role as ProfileRole
	if (role !== 'chauffeur') {
		return { ok: false, message: 'Forbidden' }
	}

	return { ok: true, session: { userId: user.id, role } }
}
