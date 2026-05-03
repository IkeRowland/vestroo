import { EmailRetryQueue } from '@/features/ops/components/EmailRetryQueue'
import {
	OpsEmptyState,
	OpsPageHeader,
} from '@/features/ops/components/ops-primitives'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { fetchBookingQuoteCommsRetryCandidates } from '@/lib/booking-quote-comms-retry'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function OpsBookingsCommsRetryPage() {
	const supabase = await createUserServerClient()
	const res = await fetchBookingQuoteCommsRetryCandidates(supabase)

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader
				title="Comms retry"
				description="Trip confirmation emails that failed to send after the quote was sent. Use Retry now for another attempt, or mark for manual follow-up after repeated failures."
			/>

			{!res.ok ? (
				<OpsFetchErrorIsland title="Retry queue could not be loaded" message={res.message} />
			) : null}

			{res.ok && res.rows.length === 0 ? (
				<OpsEmptyState
					title="Queue is clear"
					description="No booking quotes currently match the comms-retry rules."
				/>
			) : null}

			{res.ok && res.rows.length > 0 ? <EmailRetryQueue rows={res.rows} /> : null}
		</div>
	)
}
