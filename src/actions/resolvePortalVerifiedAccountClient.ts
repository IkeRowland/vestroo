import 'server-only'

import type { AccountSnapshotJsonDb } from '@/types/database.types'
import { createUserServerClient } from '@/lib/supabase/server'
import {
	type AccountDomainCandidateRow,
	buildAccountSnapshotFromRow,
} from '@/actions/client-type-resolution'

/**
 * Story 15.8 — `account_client` from portal “Book this again” without Q6 email-domain candidates.
 * Authoritative check: accepted `customer_account_members` row for the current auth user.
 *
 * Server-only — uses `next/headers` via `createUserServerClient`. Never import from a client
 * component (would re-trigger the original `next/headers` in pages-dir-browser bundle issue).
 */
export async function resolvePortalVerifiedAccountClientInsert(customerAccountId: string): Promise<{
	client_type: 'account_client'
	customer_account_id: string
	account_snapshot: AccountSnapshotJsonDb
	client_type_source: 'portal_active_account_session'
}> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user?.id) {
		throw new Error('Sign in again to continue with your organisation account.')
	}

	const { data: mem, error: memErr } = await supabase
		.from('customer_account_members')
		.select('account_id')
		.eq('profile_id', user.id)
		.eq('account_id', customerAccountId)
		.not('accepted_at', 'is', null)
		.maybeSingle()

	if (memErr || !mem?.account_id) {
		throw new Error('Account context could not be verified for this booking.')
	}

	const { data: acc, error: accErr } = await supabase
		.from('customer_accounts')
		.select('id, name, credit_terms_days, default_billing_entity_ref, default_po_required')
		.eq('id', customerAccountId)
		.maybeSingle()

	if (accErr || !acc) {
		throw new Error('Could not load organisation details for this booking.')
	}

	const row: AccountDomainCandidateRow = {
		id: String(acc.id),
		name: String(acc.name ?? ''),
		credit_terms_days: Number.isFinite(Number(acc.credit_terms_days))
			? Number(acc.credit_terms_days)
			: 0,
		default_billing_entity_ref:
			acc.default_billing_entity_ref === null || acc.default_billing_entity_ref === undefined
				? null
				: String(acc.default_billing_entity_ref),
		default_po_required: Boolean(acc.default_po_required),
	}

	return {
		client_type: 'account_client',
		customer_account_id: row.id,
		account_snapshot: buildAccountSnapshotFromRow(row),
		client_type_source: 'portal_active_account_session',
	}
}
