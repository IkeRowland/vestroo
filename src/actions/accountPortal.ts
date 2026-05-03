'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'

import {
	ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE,
	getActiveAccountCookieOptions,
	loadEligibleMemberships,
} from '@/lib/account-portal-auth'
import { createUserServerClient } from '@/lib/supabase/server'

const uuidSchema = z.string().uuid()

export async function switchActiveAccountAction(
	accountId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const parsed = uuidSchema.safeParse(accountId)
	if (!parsed.success) {
		return { ok: false, message: 'Invalid account' }
	}

	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user) {
		return { ok: false, message: 'Not authenticated' }
	}

	const memberships = await loadEligibleMemberships(user.id)
	const allowed = memberships.some((m) => m.accountId === parsed.data)
	if (!allowed) {
		return { ok: false, message: 'Not a member of this account' }
	}

	const cookieStore = await cookies()
	cookieStore.set(ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE, parsed.data, getActiveAccountCookieOptions())
	revalidatePath('/account', 'layout')
	return { ok: true }
}
