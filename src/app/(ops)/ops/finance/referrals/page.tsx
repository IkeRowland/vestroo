import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { OpsReferralsClient } from '@/features/ops/components/OpsReferralsClient'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { opsReferralsCopy } from '@/features/ops/copy/ops-referrals-copy'
import {
	countBookingsPerReferrer,
	fetchReferredBookingsForOps,
	fetchReferrersForOps,
} from '@/lib/ops-referrals-fetch'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function OpsReferralsPage() {
	const supabase = await createUserServerClient()
	const [referrersRes, bookingsRes] = await Promise.all([
		fetchReferrersForOps(supabase),
		fetchReferredBookingsForOps(supabase),
	])

	const errorMessage = referrersRes.errorMessage ?? bookingsRes.errorMessage
	const bookingCounts = countBookingsPerReferrer(bookingsRes.rows)
	const bookingCountsRecord: Record<string, number> = {}
	for (const [id, n] of bookingCounts) {
		bookingCountsRecord[id] = n
	}

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader title={opsReferralsCopy.pageTitle} description={opsReferralsCopy.pageDescription} />
			{errorMessage ? (
				<OpsFetchErrorIsland title={opsReferralsCopy.loadError} message={errorMessage} />
			) : null}
			<OpsReferralsClient
				referrers={referrersRes.rows}
				referredBookings={bookingsRes.rows}
				bookingCounts={bookingCountsRecord}
			/>
		</div>
	)
}
