import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { OpsBookingAssignTripDetailSection } from '@/features/ops/components/OpsBookingAssignTripDetailSection'
import { OpsBookingDetailAssignHashScroll } from '@/features/ops/components/ops-booking-detail-assign-hash-scroll'
import { OpsBookingDetailQuoteHashScroll } from '@/features/ops/components/ops-booking-detail-quote-hash-scroll'
import { OpsBookingDetailQueueActions } from '@/features/ops/components/ops-booking-detail-queue-actions'
import { OpsBookingImmutableSummary } from '@/features/ops/components/ops-booking-immutable-summary'
import { OpsBookingTripAssignmentSummarySection } from '@/features/ops/components/ops-booking-trip-assignment-summary'
import { QuoteDetailPanel } from '@/features/ops/components/quote-detail-panel'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { loadResolvedBookingQuoteForOps } from '@/lib/booking-current-quote'
import { evaluateAccountClientConfirmationTripGate } from '@/lib/ops-account-client-confirmation-trip-gate'
import { resolveAccountDispatchGateForBookingDetail } from '@/lib/ops-account-booking-detail-dispatch'
import { getStaffSession } from '@/lib/ops-auth'
import { isBookingDispatchable } from '@/lib/ops-booking'
import { loadOpsBookingAssignPageState } from '@/lib/ops-booking-assign-load'
import { deriveAccountsQueueStageForBookingRow } from '@/lib/ops-accounts-queue-query'
import { isDispatchSuggestionsEnabled } from '@/lib/dispatch-suggestions-env'
import {
	defaultWalkInQuoteLineLabel,
	effectiveBookingStatusKeyForOps,
	loadOpsBookingDetail,
	loadOpsBookingTripAssignmentSummary,
} from '@/lib/ops-booking-detail'
import { formatQueueStatusLabel } from '@/lib/ops-bookings-queue-query'
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
		booking.client_type === 'walk_in' || booking.client_type === 'referral'
			? deriveWalkInQueueStageForBookingRow({
					client_type: 'walk_in',
					status: booking.status,
					availability_checked_at: booking.availability_checked_at,
					booking_trips: booking.booking_trips,
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

	const tripAssignmentSummary = await loadOpsBookingTripAssignmentSummary(supabase, booking.id)
	const hasTripLinkFromEmbed =
		Array.isArray(booking.booking_trips) && booking.booking_trips.length > 0
	const hasTripLink = tripAssignmentSummary != null || hasTripLinkFromEmbed

	const showAccountPendingAssignFlow =
		booking.client_type === 'account_client' && booking.status === 'pending_confirmation'

	const tripGate =
		showAccountPendingAssignFlow && hasTripLink
			? await evaluateAccountClientConfirmationTripGate(supabase, booking.id)
			: ({ ok: true } as const)
	const tripReadinessMessage = tripGate.ok ? null : tripGate.message

	const accountPendingNeedsAssignEmbed =
		showAccountPendingAssignFlow && (!hasTripLink || !tripGate.ok)

	const assignStageOk =
		(walkInStage === 'ready_to_assign' &&
			(booking.client_type === 'walk_in' || booking.client_type === 'referral')) ||
		(booking.client_type === 'account_client' &&
			(accountStage === 'availability_checked' || accountStage === 'pending_confirmation'))
	const dispatchBlocked =
		booking.client_type === 'account_client' &&
		dispatchGate.kind === 'blocked' &&
		typeof dispatchGate.reasonCode === 'string' &&
		dispatchGate.reasonCode.length > 0
	const showAssignEmbed =
		assignStageOk &&
		(booking.client_type === 'account_client' && booking.status === 'pending_confirmation'
			? accountPendingNeedsAssignEmbed
			: !hasTripLink)

	let assignTripDetailSlot: ReactNode = null
	if (showAssignEmbed) {
		const [assignState, dispatchable, staffSession] = await Promise.all([
			loadOpsBookingAssignPageState(supabase, booking.id),
			isBookingDispatchable(supabase, {
				id: booking.id,
				client_type: booking.client_type === 'account_client' ? 'account_client' : 'walk_in',
				status: booking.status,
				payment_status: booking.payment_status,
				booking_intent: booking.booking_intent,
			}),
			getStaffSession(),
		])
		const viewerIsAdmin = staffSession?.role === 'admin'
		const matchingDrivers = assignState.drivers.filter((d) => d.matches_requested_class)
		const dispatchSuggestionsEnabled = isDispatchSuggestionsEnabled()
		assignTripDetailSlot = (
			<OpsBookingAssignTripDetailSection
				bookingId={booking.id}
				assignStageOk={assignStageOk}
				dispatchBlocked={dispatchBlocked}
				walkInNotDispatchable={
					(booking.client_type === 'walk_in' || booking.client_type === 'referral') &&
					!dispatchable.ok
				}
				dispatchable={dispatchable}
				matchingDrivers={matchingDrivers}
				driversError={assignState.driversError}
				requestedVehicleClass={assignState.requested_vehicle_class}
				clientType={booking.client_type === 'account_client' ? 'account_client' : 'walk_in'}
				viewerIsAdmin={viewerIsAdmin}
				dispatchSuggestionsEnabled={dispatchSuggestionsEnabled}
				tripAssignmentPersisted={hasTripLink}
				tripReadinessMessage={tripReadinessMessage}
			/>
		)
	}

	const statusKeyForHeader = effectiveBookingStatusKeyForOps(booking.status, booking.booking_trips)

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader
				title="Booking detail"
				description={
					<>
						Booking{' '}
						<code className="font-mono text-xs text-ops-foreground">{booking.id}</code>
						{statusKeyForHeader ? (
							<>
								{' '}
								· status{' '}
								<span className="font-medium">
									{formatQueueStatusLabel(statusKeyForHeader)}
								</span>
							</>
						) : null}
					</>
				}
			/>
			<OpsBookingImmutableSummary
				booking={booking}
				displayBookingTotalZar={markEftDefaultZar}
			/>
			{tripAssignmentSummary ? (
				<OpsBookingTripAssignmentSummarySection summary={tripAssignmentSummary} />
			) : null}
			<OpsBookingDetailQueueActions
				bookingId={booking.id}
				walkInStage={walkInStage}
				accountStage={accountStage}
				totalAmountZar={markEftDefaultZar}
				dispatchGate={dispatchGate}
				assignTripDetailSlot={assignTripDetailSlot}
				accountDetailTripLinked={tripAssignmentSummary != null}
			/>
			<QuoteDetailPanel
				bookingId={booking.id}
				clientType={booking.client_type as string | null}
				bookingStatus={booking.status as string | null}
				quote={quote}
				defaultQuoteLineLabel={defaultQuoteLineLabel}
			/>
			<OpsBookingDetailQuoteHashScroll />
			<OpsBookingDetailAssignHashScroll />
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
