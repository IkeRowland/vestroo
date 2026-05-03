'use server'

import { cookies } from 'next/headers'

import { requireAccountMemberPage } from '@/lib/account-portal-auth'
import {
	getBookAgainHandoffCookieOptions,
	VESTROO_BOOK_AGAIN_ACCOUNT_COOKIE,
} from '@/lib/book-again-portal-handoff.server'

export async function setBookAgainPortalHandoffCookieAction(): Promise<
	{ ok: true } | { ok: false; error: string }
> {
	try {
		const session = await requireAccountMemberPage()
		const c = await cookies()
		c.set(VESTROO_BOOK_AGAIN_ACCOUNT_COOKIE, session.activeAccountId, getBookAgainHandoffCookieOptions())
		return { ok: true }
	} catch {
		return { ok: false, error: 'Could not prepare booking handoff.' }
	}
}

export async function clearBookAgainPortalHandoffCookieAction(): Promise<void> {
	const c = await cookies()
	const opts = getBookAgainHandoffCookieOptions()
	c.set(VESTROO_BOOK_AGAIN_ACCOUNT_COOKIE, '', { ...opts, maxAge: 0 })
}
