'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'

import {
	loadEligibleMemberships,
	resolveActiveAccountForPortal,
} from '@/lib/account-portal-auth'
import { ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE } from '@/lib/account-portal-auth-shared'
import { createUserServerClient } from '@/lib/supabase/server'

const billingRefSchema = z
	.string()
	.max(200)
	.transform((s) => (s.trim().length === 0 ? null : s.trim()))

const rpcOkSchema = z.object({ ok: z.literal(true) })
const rpcErrSchema = z.object({
	ok: z.literal(false),
	reason: z.string(),
})

async function requirePortalAdminForOrgPrefs(): Promise<
	| { ok: true; supabase: Awaited<ReturnType<typeof createUserServerClient>>; activeAccountId: string }
	| { ok: false }
> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user) return { ok: false }

	const memberships = await loadEligibleMemberships(user.id)
	if (memberships.length === 0) return { ok: false }

	const cookieStore = await cookies()
	const cookieVal = cookieStore.get(ACCOUNT_PORTAL_ACTIVE_ACCOUNT_COOKIE)?.value
	const { activeAccountId } = resolveActiveAccountForPortal(memberships, cookieVal)
	const role = memberships.find((m) => m.accountId === activeAccountId)?.role
	if (role !== 'admin') return { ok: false }

	return { ok: true, supabase, activeAccountId }
}

export type BillingEntityFormState = { ok: boolean | null; message: string | null }

export const initialBillingEntityFormState: BillingEntityFormState = { ok: null, message: null }

/**
 * Sets `customer_accounts.default_billing_entity_ref` for the active account (accepted admins only).
 * Implemented via **`set_customer_account_default_billing_entity`** (SECURITY DEFINER) — Story 18.8.
 */
export async function updateAccountDefaultBillingEntityAction(
	_prev: BillingEntityFormState,
	formData: FormData,
): Promise<BillingEntityFormState> {
	const gate = await requirePortalAdminForOrgPrefs()
	if (!gate.ok) {
		return { ok: false, message: 'You do not have permission to update billing defaults for this account.' }
	}
	const { supabase, activeAccountId } = gate

	const rawRef = formData.get('default_billing_entity_ref')
	const parsed = billingRefSchema.safeParse(typeof rawRef === 'string' ? rawRef : '')
	if (!parsed.success) {
		return { ok: false, message: 'Invalid billing entity reference.' }
	}

	const { data: rpcData, error: rpcErr } = await supabase.rpc('set_customer_account_default_billing_entity', {
		p_account_id: activeAccountId,
		p_default_billing_entity_ref: parsed.data,
	})

	if (rpcErr) {
		return { ok: false, message: rpcErr.message }
	}

	const okParsed = rpcOkSchema.safeParse(rpcData)
	if (okParsed.success) {
		revalidatePath('/account/preferences')
		revalidatePath('/account')
		return { ok: true, message: null }
	}

	const errParsed = rpcErrSchema.safeParse(rpcData)
	if (errParsed.success) {
		const r = errParsed.data.reason
		if (r === 'forbidden' || r === 'not_authenticated') {
			return { ok: false, message: 'You do not have permission to update billing defaults for this account.' }
		}
		if (r === 'not_found') {
			return { ok: false, message: 'Organisation record was not found.' }
		}
		if (r === 'ref_too_long') {
			return { ok: false, message: 'Billing entity reference is too long (max 200 characters).' }
		}
		return { ok: false, message: 'Could not save the default billing entity. Try again.' }
	}

	return { ok: false, message: 'Unexpected response from server.' }
}

