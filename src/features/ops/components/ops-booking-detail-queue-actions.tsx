'use client'

import type { ReactNode } from 'react'

import {
	AccountQueueRowActions,
	type AccountDispatchGate,
} from '@/features/ops/components/AccountQueueRowActions'
import { WalkInQueueRowActions } from '@/features/ops/components/WalkInQueueRowActions'
import type { OpsAccountsStageKey } from '@/lib/ops-accounts-queue-query'
import type { OpsWalkInStageKey } from '@/lib/ops-walk-in-queue-query'

type Props = {
	bookingId: string
	walkInStage: OpsWalkInStageKey | null
	accountStage: OpsAccountsStageKey | null
	totalAmountZar: number | null
	dispatchGate: AccountDispatchGate
	/** When set, **Assign trip** on booking detail renders this panel instead of navigating away. */
	assignTripDetailSlot?: ReactNode | null
	/** `/ops/bookings/[id]` account rows: a `booking_trips` link exists — hide redundant Assign trip fallback. */
	accountDetailTripLinked?: boolean
}

/**
 * Same stage-based primary actions as **Bookings** queue rows, for `/ops/bookings/[id]` (no table row navigation).
 */
export function OpsBookingDetailQueueActions({
	bookingId,
	walkInStage,
	accountStage,
	totalAmountZar,
	dispatchGate,
	assignTripDetailSlot = null,
	accountDetailTripLinked = false,
}: Props) {
	if (walkInStage != null) {
		return (
			<section
				className="rounded-lg border border-ops-border bg-ops-surface/50 px-4 py-3"
				aria-label="Next booking action"
			>
				<h2 className="text-sm font-semibold text-ops-foreground">Next action</h2>
				<div className="mt-2">
					<WalkInQueueRowActions
						bookingId={bookingId}
						activeStage={walkInStage}
						totalAmountZar={totalAmountZar}
						surface="detail"
						detailAssignSlot={assignTripDetailSlot}
					/>
				</div>
			</section>
		)
	}
	if (accountStage != null) {
		return (
			<section
				className="rounded-lg border border-ops-border bg-ops-surface/50 px-4 py-3"
				aria-label="Next booking action"
			>
				<h2 className="text-sm font-semibold text-ops-foreground">Next action</h2>
				<div className="mt-2">
					<AccountQueueRowActions
						bookingId={bookingId}
						activeStage={accountStage}
						totalAmountZar={totalAmountZar}
						dispatchGate={dispatchGate}
						surface="detail"
						detailAssignSlot={assignTripDetailSlot}
						accountDetailTripLinked={accountDetailTripLinked}
					/>
				</div>
			</section>
		)
	}
	return null
}
