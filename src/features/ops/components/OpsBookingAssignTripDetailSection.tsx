import Link from 'next/link'

import { OpsBookingAssignTripForm } from '@/features/ops/components/OpsBookingAssignTripForm'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import type { IsBookingDispatchableResult } from '@/lib/ops-booking'
import type { OpsBookingAssignableDriverRow } from '@/lib/ops-booking-assign-load'

type Props = {
	bookingId: string
	assignStageOk: boolean
	dispatchBlocked: boolean
	walkInNotDispatchable: boolean
	dispatchable: IsBookingDispatchableResult
	matchingDrivers: OpsBookingAssignableDriverRow[]
	driversError: string | null
	requestedVehicleClass: string | null
	clientType: 'walk_in' | 'account_client'
	viewerIsAdmin: boolean
	dispatchSuggestionsEnabled?: boolean
	/** True when a `booking_trips` row exists (authoritative; embed on `bookings` can be empty under RLS). */
	tripAssignmentPersisted?: boolean
	/** From {@link evaluateAccountClientConfirmationTripGate} when the trip link exists but is not confirmable yet. */
	tripReadinessMessage?: string | null
}

/**
 * Assign-trip panel for **`/ops/bookings/[id]`** (embedded in “Next action”). Mirrors the former
 * standalone assign screen branching without duplicating the immutable summary above.
 */
export function OpsBookingAssignTripDetailSection({
	bookingId,
	assignStageOk,
	dispatchBlocked,
	walkInNotDispatchable,
	dispatchable,
	matchingDrivers,
	driversError,
	requestedVehicleClass,
	clientType,
	viewerIsAdmin,
	dispatchSuggestionsEnabled = false,
	tripAssignmentPersisted = false,
	tripReadinessMessage = null,
}: Props) {
	const assignFormReady =
		assignStageOk && !dispatchBlocked && matchingDrivers.length > 0 && !walkInNotDispatchable

	return (
		<div className="min-w-0 max-w-full space-y-4">
			{driversError ? (
				<OpsFetchErrorIsland title="Drivers could not be loaded" message={driversError} />
			) : null}

			{!assignStageOk ? (
				<OpsEmptyState
					title="Assign trip is not available for this stage"
					description="Use the sections on this page for the next workflow step (for example payment, availability, or quote)."
				/>
			) : walkInNotDispatchable ? (
				<OpsEmptyState
					title="This booking cannot be assigned yet"
					description={
						!dispatchable.ok
							? dispatchable.kind === 'walk_in_unpaid'
								? 'Payment or status must be ready before ops can assign a trip.'
								: dispatchable.kind === 'rpc_error'
									? dispatchable.message
									: 'This booking is not ready for assignment.'
							: 'This booking is not ready for assignment.'
					}
				/>
			) : dispatchBlocked ? (
				<OpsEmptyState
					title="Dispatch blocked for this account"
					description="Resolve the account issue using the dispatch chip above, or use an admin override on this page when eligible."
				/>
			) : matchingDrivers.length === 0 ? (
				tripAssignmentPersisted ? (
					<OpsEmptyState
						title="Trip is linked to this booking"
						description={
							tripReadinessMessage && tripReadinessMessage.trim().length > 0
								? tripReadinessMessage
								: 'A driver and vehicle are assigned. If you still see this panel, refresh the page. Save the quote in the Quote section — when both trip and quote are ready, the booking confirms automatically.'
						}
					/>
				) : (
					<OpsEmptyState
						title="No drivers match this vehicle class"
						description={
							requestedVehicleClass
								? `No available driver has a default fleet vehicle in class “${requestedVehicleClass}”. Set each driver’s default vehicle (and category) in Fleet → Drivers, or adjust the booking’s requested class if it was captured incorrectly.`
								: 'No eligible drivers with a default fleet vehicle were found. Configure default vehicles in Fleet → Drivers.'
						}
						action={
							<Link
								href="/ops/fleet/drivers"
								className="text-sm font-medium text-emerald-400 underline-offset-2 hover:underline"
							>
								Open Fleet drivers
							</Link>
						}
					/>
				)
			) : assignFormReady ? (
				<>
					{clientType === 'account_client' && !dispatchable.ok ? (
						<p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
							Account dispatch checks did not pass — you can still try to assign; admins may see an
							override option when the block reason allows it.
						</p>
					) : null}
					<OpsBookingAssignTripForm
						bookingId={bookingId}
						matchingDrivers={matchingDrivers}
						viewerIsAdmin={viewerIsAdmin}
						dispatchSuggestionsEnabled={dispatchSuggestionsEnabled}
					/>
				</>
			) : null}
		</div>
	)
}
