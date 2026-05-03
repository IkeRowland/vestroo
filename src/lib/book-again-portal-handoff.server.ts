import 'server-only'

import { cookies } from 'next/headers'
import { z } from 'zod'

import { createUserServerClient } from '@/lib/supabase/server'

/** Short-lived handoff from `/account/*` to `/book/*` (path `/` so `/book/search` receives it). Story 15.8. */
export const VESTROO_BOOK_AGAIN_ACCOUNT_COOKIE = 'vestroo_book_again_account_id'

export type BookAgainPortalSearchBootstrap = {
	customerAccountId: string
	accountDisplayName: string
	defaultPoRequired: boolean
	defaultBillingEntityRef: string | null
	memberEmail: string
	memberName: string
}

export function getBookAgainHandoffCookieOptions(): {
	httpOnly: boolean
	secure: boolean
	sameSite: 'lax'
	path: string
	maxAge: number
} {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: 600,
	}
}

/**
 * Verified booking-store bootstrap for a portal account the current user belongs to.
 * Used by `/account/bookings` embedded booking form (session active account) and by the book-again cookie handoff.
 */
export async function loadVerifiedPortalBootstrapForAccount(
	accountId: string,
): Promise<BookAgainPortalSearchBootstrap | null> {
	const idParse = z.string().uuid().safeParse(accountId.trim())
	if (!idParse.success) return null

	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user?.id) return null

	const { data: mem, error: memErr } = await supabase
		.from('customer_account_members')
		.select('account_id')
		.eq('profile_id', user.id)
		.eq('account_id', idParse.data)
		.not('accepted_at', 'is', null)
		.maybeSingle()

	if (memErr || !mem?.account_id) return null

	const { data: acc, error: accErr } = await supabase
		.from('customer_accounts')
		.select('id, name, default_po_required, default_billing_entity_ref')
		.eq('id', idParse.data)
		.maybeSingle()

	if (accErr || !acc) return null

	const meta = user.user_metadata as Record<string, unknown> | undefined
	const fullName =
		(typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
		(typeof meta?.name === 'string' && meta.name.trim()) ||
		''

	return {
		customerAccountId: String(acc.id),
		accountDisplayName: String(acc.name ?? ''),
		defaultPoRequired: Boolean(acc.default_po_required),
		defaultBillingEntityRef:
			acc.default_billing_entity_ref === null || acc.default_billing_entity_ref === undefined
				? null
				: String(acc.default_billing_entity_ref),
		memberEmail: typeof user.email === 'string' ? user.email : '',
		memberName: fullName,
	}
}

/**
 * Reads the handoff cookie and returns verified account + member context for `/book/search`.
 * Does **not** clear the cookie (client calls `clearBookAgainPortalHandoffCookieAction` after hydrating the store).
 */
export async function loadBookAgainPortalBootstrap(): Promise<BookAgainPortalSearchBootstrap | null> {
	const cookieStore = await cookies()
	const raw = cookieStore.get(VESTROO_BOOK_AGAIN_ACCOUNT_COOKIE)?.value
	if (!raw?.trim()) return null
	const idParse = z.string().uuid().safeParse(raw.trim())
	if (!idParse.success) return null

	return loadVerifiedPortalBootstrapForAccount(idParse.data)
}
