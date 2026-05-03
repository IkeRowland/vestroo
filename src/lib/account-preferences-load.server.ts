import type { SupabaseClient } from '@supabase/supabase-js'

import { mergeBillingEntityOptionList } from '@/lib/account-preferences-billing'

const BOOKING_REF_PAGE = 500

/**
 * Sorted distinct billing references for the account picklist, including the current default if set.
 */
export async function loadBillingEntitySelectOptions(
	supabase: SupabaseClient,
	accountId: string,
	currentDefault: string | null,
): Promise<string[]> {
	const raw: string[] = []
	const { data, error } = await supabase
		.from('bookings')
		.select('billing_entity_ref')
		.eq('customer_account_id', accountId)
		.not('billing_entity_ref', 'is', null)
		.limit(BOOKING_REF_PAGE)

	if (!error && data) {
		for (const row of data as { billing_entity_ref: string | null }[]) {
			if (row.billing_entity_ref) raw.push(row.billing_entity_ref)
		}
	}

	return mergeBillingEntityOptionList(raw, currentDefault)
}
