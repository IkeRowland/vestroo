import { redirect } from 'next/navigation'

import { createUserServerClient } from '@/lib/supabase/server'
import type { ProfileRole } from '@/types/database.types'

const STAFF_ROLES: ReadonlySet<ProfileRole> = new Set(['dispatcher', 'admin'])

export type StaffSession = {
	userId: string
	role: ProfileRole
	/** Present when Supabase Auth exposes an email for the user (top bar). */
	email?: string
	/** `profiles.full_name` when non-empty (FE.17.2 profile chip). */
	displayName?: string
	/** `profiles.avatar_url` — optional headshot for profile chip. */
	avatarUrl?: string | null
}

export async function getStaffSession(): Promise<StaffSession | null> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user) return null

	const { data: profile, error: profileErr } = await supabase
		.from('profiles')
		.select('role, full_name, avatar_url')
		.eq('id', user.id)
		.maybeSingle()

	if (profileErr || !profile?.role) return null
	const role = profile.role as ProfileRole
	if (!STAFF_ROLES.has(role)) return null

	const fullName = (profile.full_name as string | null | undefined)?.trim()
	return {
		userId: user.id,
		role,
		email: user.email ?? undefined,
		displayName: fullName || undefined,
		avatarUrl: (profile.avatar_url as string | null | undefined) ?? null,
	}
}

/**
 * Server Components / layouts: unauthenticated → login; authenticated but not staff → unauthorized.
 */
export async function requireOpsStaffPage(): Promise<StaffSession> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user) {
		redirect('/ops/login')
	}

	const { data: profile, error: profileErr } = await supabase
		.from('profiles')
		.select('role, full_name, avatar_url')
		.eq('id', user.id)
		.maybeSingle()

	if (profileErr || !profile?.role) {
		redirect('/ops/unauthorized')
	}

	const role = profile.role as ProfileRole
	if (!STAFF_ROLES.has(role)) {
		redirect('/ops/unauthorized')
	}

	const fullName = (profile.full_name as string | null | undefined)?.trim()
	return {
		userId: user.id,
		role,
		email: user.email ?? undefined,
		displayName: fullName || undefined,
		avatarUrl: (profile.avatar_url as string | null | undefined) ?? null,
	}
}

export type AdminSession = {
	userId: string
	role: 'admin'
}

/**
 * Server Components / layouts: same gate as {@link requireOpsStaffPage}, but **admin** only.
 */
export async function requireOpsAdminPage(): Promise<AdminSession> {
	const staff = await requireOpsStaffPage()
	if (staff.role !== 'admin') {
		redirect('/ops/unauthorized')
	}
	return { userId: staff.userId, role: 'admin' }
}

export type OpsActionGate =
	| { ok: true; session: StaffSession }
	| { ok: false; message: string }

/**
 * Server Actions: return an error result instead of redirecting (403-style message).
 */
export async function getOpsStaffForAction(): Promise<OpsActionGate> {
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
		.select('role, full_name, avatar_url')
		.eq('id', user.id)
		.maybeSingle()

	if (profileErr || !profile?.role) {
		return { ok: false, message: 'Forbidden' }
	}

	const role = profile.role as ProfileRole
	if (!STAFF_ROLES.has(role)) {
		return { ok: false, message: 'Forbidden' }
	}

	const fullName = (profile.full_name as string | null | undefined)?.trim()
	return {
		ok: true,
		session: {
			userId: user.id,
			role,
			email: user.email ?? undefined,
			displayName: fullName || undefined,
			avatarUrl: (profile.avatar_url as string | null | undefined) ?? null,
		},
	}
}

export type OpsAdminActionGate =
	| { ok: true; session: AdminSession }
	| { ok: false; message: string }

/**
 * Server Actions that MUST be restricted to platform admin (DSR export / anonymise).
 * Dispatchers receive Forbidden even though is_staff() is true in the database.
 */
export async function getOpsAdminForAction(): Promise<OpsAdminActionGate> {
	const staff = await getOpsStaffForAction()
	if (!staff.ok) {
		return staff
	}
	if (staff.session.role !== 'admin') {
		return { ok: false, message: 'Admin only' }
	}
	return { ok: true, session: { userId: staff.session.userId, role: 'admin' } }
}
