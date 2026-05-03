'use client'

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
	hasAvailabilityRoute: boolean
	totalAmountZar: number | null
	dispatchGate: AccountDispatchGate
}

/**
 * Same stage-based primary actions as **Bookings** queue rows, for `/ops/bookings/[id]` (no table row navigation).
 */
export function OpsBookingDetailQueueActions({
	bookingId,
	walkInStage,
	accountStage,
	hasAvailabilityRoute,
	totalAmountZar,
	dispatchGate,
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
						hasAvailabilityRoute={hasAvailabilityRoute}
						totalAmountZar={totalAmountZar}
						surface="detail"
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
						hasAvailabilityRoute={hasAvailabilityRoute}
						totalAmountZar={totalAmountZar}
						dispatchGate={dispatchGate}
						surface="detail"
					/>
				</div>
			</section>
		)
	}
	return null
}
