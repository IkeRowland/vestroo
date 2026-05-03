'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { triageAccountBookingAction } from '@/actions/triageAccountBooking'
import { AccountDispatchBlockChip } from '@/features/ops/components/AccountDispatchBlockChip'
import { MarkPaymentReceivedDialog } from '@/features/ops/components/mark-payment-received-dialog'
import { Button } from '@/components/ui/button'
import {
	isOpsActionFailure,
	type NotDispatchableAccountDetail,
	opsActionCorrelationId,
	opsActionErrorMessage,
} from '@/lib/ops-action-result'
import { opsFulfilAssignBookingHref } from '@/lib/ops-fulfil-nav'
import type { OpsAccountsStageKey } from '@/lib/ops-accounts-queue-query'

const B2_DISABLED_TITLE = 'Availability check UI — Theme B2'

export type AccountDispatchGate =
	| { kind: 'ok' }
	| { kind: 'blocked'; reasonCode: string; detail?: NotDispatchableAccountDetail }
	| { kind: 'unknown' }

type AccountQueueRowActionsProps = {
	bookingId: string
	activeStage: OpsAccountsStageKey
	hasAvailabilityRoute: boolean
	totalAmountZar: number | null
	dispatchGate: AccountDispatchGate
	/**
	 * **`detail`** — `/ops/bookings/[id]`: avoid a self-link on **Confirm dispatch** and drop
	 * queue-only filler for terminal stages.
	 */
	surface?: 'queue' | 'detail'
}

/**
 * Per-stage CTA cluster for account queue rows (Story 16.21 / AC3 + AC4).
 *
 * - **New** → Triage (`triageAccountBookingAction`).
 * - **Triaged** → Check availability (B2 route gated; disabled with tooltip until route lands).
 * - **Availability checked** → Assign trip (`opsFulfilAssignBookingHref`); disabled when dispatch chip blocks.
 * - **Assigned** → Confirm dispatch — Link to booking detail where the **Epic 13** trip-confirmation
 *   email is reviewed/resent. The email is sent server-side as part of `assignBookingToRun`; this CTA is
 *   the ops-facing "verify the comm went out" handoff. Disabled when dispatch chip blocks (e.g. credit
 *   limit exceeded after assignment but before dispatch).
 * - **In progress** → view-only.
 * - **Completed** → Hand off to invoicing (`/ops/invoicing?tab=ready`).
 * - **Invoiced** → Mark EFT received (`MarkPaymentReceivedDialog` → `markBookingPaymentReceivedAction`, Q32).
 * - **Paid** → terminal (view-only).
 */
export function AccountQueueRowActions({
	bookingId,
	activeStage,
	hasAvailabilityRoute,
	totalAmountZar,
	dispatchGate,
	surface = 'queue',
}: AccountQueueRowActionsProps) {
	const router = useRouter()
	const [payOpen, setPayOpen] = useState(false)
	const [triageErr, setTriageErr] = useState<string | null>(null)
	const [triagePending, startTriage] = useTransition()

	const availabilityHref = `/ops/bookings/${encodeURIComponent(bookingId)}/availability`
	const bookingDetailHref = `/ops/bookings/${encodeURIComponent(bookingId)}`
	const handoffInvoicingHref = '/ops/invoicing?tab=ready'

	const stopRowNav = (e: React.MouseEvent | React.KeyboardEvent) => {
		e.stopPropagation()
	}

	const dispatchBlocked = dispatchGate.kind === 'blocked'
	const blockTitle = dispatchBlocked
		? 'Dispatch is blocked for this account booking. Resolve the chip reason before continuing.'
		: undefined

	return (
		<div className="flex min-w-[10rem] flex-col gap-1.5">
			{dispatchGate.kind === 'blocked' ? (
				<AccountDispatchBlockChip
					reasonCode={dispatchGate.reasonCode}
					detail={dispatchGate.detail}
				/>
			) : null}

			{activeStage === 'new' ? (
				<>
					{triageErr ? <p className="text-xs text-destructive">{triageErr}</p> : null}
					<Button
						type="button"
						size="sm"
						variant="secondary"
						disabled={triagePending}
						onClick={(e) => {
							e.stopPropagation()
							setTriageErr(null)
							startTriage(async () => {
								const res = await triageAccountBookingAction({ bookingId })
								if (!res.ok && isOpsActionFailure(res)) {
									const ref = opsActionCorrelationId(res)
									const suffix = ref ? ` (${ref.slice(0, 8)}…)` : ''
									setTriageErr(`${opsActionErrorMessage(res)}${suffix}`)
									return
								}
								router.refresh()
							})
						}}
					>
						{triagePending ? 'Working…' : 'Triage'}
					</Button>
				</>
			) : null}

			{activeStage === 'triaged' ? (
				hasAvailabilityRoute ? (
					<Button type="button" size="sm" variant="outline" asChild>
						<Link href={availabilityHref} onClick={stopRowNav}>
							Check availability
						</Link>
					</Button>
				) : (
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled
						title={B2_DISABLED_TITLE}
						onClick={stopRowNav}
					>
						Check availability
					</Button>
				)
			) : null}

			{activeStage === 'availability_checked' ? (
				dispatchBlocked ? (
					<Button
						type="button"
						size="sm"
						variant="default"
						disabled
						title={blockTitle}
						onClick={stopRowNav}
					>
						Assign trip
					</Button>
				) : (
					<Button type="button" size="sm" variant="default" asChild>
						<Link href={opsFulfilAssignBookingHref(bookingId)} onClick={stopRowNav}>
							Assign trip
						</Link>
					</Button>
				)
			) : null}

			{activeStage === 'assigned' && surface === 'queue' ? (
				dispatchBlocked ? (
					<Button
						type="button"
						size="sm"
						variant="default"
						disabled
						title={blockTitle}
						onClick={stopRowNav}
					>
						Confirm dispatch
					</Button>
				) : (
					<Button type="button" size="sm" variant="default" asChild>
						<Link href={bookingDetailHref} onClick={stopRowNav}>
							Confirm dispatch
						</Link>
					</Button>
				)
			) : null}

			{activeStage === 'assigned' && surface === 'detail' ? (
				dispatchBlocked ? (
					<Button
						type="button"
						size="sm"
						variant="default"
						disabled
						title={blockTitle}
						onClick={stopRowNav}
					>
						Confirm dispatch
					</Button>
				) : (
					<p className="text-xs text-ops-muted">
						Review trip confirmation and dispatch email in the sections below.
					</p>
				)
			) : null}

			{activeStage === 'completed' ? (
				<Button type="button" size="sm" variant="default" asChild>
					<Link href={handoffInvoicingHref} onClick={stopRowNav}>
						Hand off to invoicing
					</Link>
				</Button>
			) : null}

			{activeStage === 'invoiced' ? (
				<>
					<Button
						type="button"
						size="sm"
						variant="default"
						onClick={(e) => {
							e.stopPropagation()
							setPayOpen(true)
						}}
					>
						Mark EFT received
					</Button>
					<MarkPaymentReceivedDialog
						bookingId={bookingId}
						defaultAmountZar={totalAmountZar}
						open={payOpen}
						onOpenChange={setPayOpen}
					/>
				</>
			) : null}

			{surface === 'queue' && (activeStage === 'in_progress' || activeStage === 'paid') ? (
				<span className="text-xs text-ops-muted">View row / open detail</span>
			) : null}
		</div>
	)
}
