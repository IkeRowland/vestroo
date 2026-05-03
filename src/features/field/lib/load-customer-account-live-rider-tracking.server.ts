import { createServerClient } from '@/lib/supabase/server'

/**
 * Reads `customer_accounts.live_rider_tracking` using the **service role** client.
 *
 * **RLS / security:** Chauffeur JWTs generally **cannot** `SELECT` `customer_accounts`
 * (policies are staff + account members only). Call this **only** after
 * `requireChauffeurPage`, trip `chauffeur_id` ownership, and loading
 * `bookings.customer_account_id` via **`createUserServerClient`** for a booking linked
 * to that trip — so the `customerAccountId` is never widened beyond what the chauffeur
 * was already allowed to see on the booking row.
 */
export async function loadCustomerAccountLiveRiderTrackingFlag(
	customerAccountId: string,
): Promise<boolean> {
	const admin = await createServerClient()
	const { data, error } = await admin
		.from('customer_accounts')
		.select('live_rider_tracking')
		.eq('id', customerAccountId)
		.maybeSingle()

	if (error || !data) {
		return false
	}
	return Boolean(data.live_rider_tracking)
}
