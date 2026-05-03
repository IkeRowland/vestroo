import Link from 'next/link'
import { notFound } from 'next/navigation'

import { OpsBookingDetailQueueActions } from '@/features/ops/components/ops-booking-detail-queue-actions'
import { OpsBookingImmutableSummary } from '@/features/ops/components/ops-booking-immutable-summary'
import { QuoteDetailPanel } from '@/features/ops/components/quote-detail-panel'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { loadResolvedBookingQuoteForOps } from '@/lib/booking-current-quote'
import { resolveAccountDispatchGateForBookingDetail } from '@/lib/ops-account-booking-detail-dispatch'
import { opsBookingsAvailabilityCheckPageExists } from '@/lib/ops-bookings-availability-route'
import { deriveAccountsQueueStageForBookingRow } from '@/lib/ops-accounts-queue-query'
import { defaultWalkInQuoteLineLabel, loadOpsBookingDetail } from '@/lib/ops-booking-detail'
import { deriveWalkInQueueStageForBookingRow } from '@/lib/ops-walk-in-queue-query'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
	params: Promise<{ id: string }>
}

export default async function OpsBookingDetailPage({ params }: PageProps) {
	const { id } = await params
	const supabase = await createUserServerClient()

	const booking = await loadOpsBookingDetail(supabase, id)
	if (!booking) {
		notFound()
	}

	let quote = null
	try {
		quote = await loadResolvedBookingQuoteForOps(
			supabase,
			booking.id,
			booking.current_quote_id as string | null,
		)
	} catch {
		throw new Error('Could not load quote for this booking.')
	}

	const defaultQuoteLineLabel = defaultWalkInQuoteLineLabel(booking)
	const markEftDefaultZar =
		quote != null && Number.isFinite(quote.total_zar) ? quote.total_zar : booking.total_amount

	const walkInStage =
		booking.client_type === 'walk_in'
			? deriveWalkInQueueStageForBookingRow({
					client_type: booking.client_type,
					status: booking.status,
					availability_checked_at: booking.availability_checked_at,
				})
			: null
	const accountStage =
		booking.client_type === 'account_client'
			? deriveAccountsQueueStageForBookingRow({
					client_type: booking.client_type,
					status: booking.status,
					availability_checked_at: booking.availability_checked_at,
				})
			: null

	const dispatchGate =
		booking.client_type === 'account_client'
			? await resolveAccountDispatchGateForBookingDetail(supabase, {
					id: booking.id,
					client_type: booking.client_type,
					status: booking.status,
					availability_checked_at: booking.availability_checked_at,
					customer_account_id: booking.customer_account_id,
					total_amount: booking.total_amount,
				})
			: ({ kind: 'unknown' } as const)

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader
				title="Booking detail"
				description={
					<>
						Booking{' '}
						<code className="font-mono text-xs text-ops-foreground">{booking.id}</code>
						{booking.status ? (
							<>
								{' '}
								· status <span className="font-medium">{booking.status}</span>
							</>
						) : null}
					</>
				}
			/>
			<OpsBookingImmutableSummary booking={booking} />
			<OpsBookingDetailQueueActions
				bookingId={booking.id}
				walkInStage={walkInStage}
				accountStage={accountStage}
				hasAvailabilityRoute={opsBookingsAvailabilityCheckPageExists()}
				totalAmountZar={markEftDefaultZar}
				dispatchGate={dispatchGate}
			/>
			<QuoteDetailPanel
				bookingId={booking.id}
				clientType={booking.client_type as string | null}
				bookingStatus={booking.status as string | null}
				quote={quote}
				defaultQuoteLineLabel={defaultQuoteLineLabel}
			/>
			<p>
				<Link
					href="/ops/bookings"
					className="text-sm font-medium text-primary underline-offset-2 hover:underline"
				>
					← Back to bookings queue
				</Link>
			</p>
		</div>
	)
}
