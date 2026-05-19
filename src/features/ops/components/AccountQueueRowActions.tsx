'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { AccountDispatchBlockChip } from '@/features/ops/components/AccountDispatchBlockChip'
import { MarkPaymentReceivedDialog } from '@/features/ops/components/mark-payment-received-dialog'
import { Button } from '@/components/ui/button'
import { OPS_BOOKING_ASSIGN_ANCHOR_ID } from '@/features/ops/ops-bookings-url'
import type { NotDispatchableAccountDetail } from '@/lib/ops-action-result'
import { opsFulfilAssignBookingHref } from '@/lib/ops-fulfil-nav'
import type { OpsAccountsStageKey } from '@/lib/ops-accounts-queue-query'

export type AccountDispatchGate =
	| { kind: 'ok' }
	| { kind: 'blocked'; reasonCode: string; detail?: NotDispatchableAccountDetail }
	| { kind: 'unknown' }

type AccountQueueRowActionsProps = {
	bookingId: string
	activeStage: OpsAccountsStageKey
	totalAmountZar: number | null
	dispatchGate: AccountDispatchGate
	/**
	 * **`detail`** — `/ops/bookings/[id]`: avoid a self-link on **Confirm dispatch** and drop
	 * queue-only filler for terminal stages.
	 */
	surface?: 'queue' | 'detail'
	detailAssignSlot?: ReactNode | null
	/**
	 * Booking detail only: **`booking_trips`** row exists — do not show the **Assign trip** deep-link
	 * fallback under **Pending confirmation** (assignment is shown in **Trip assignment**).
	 */
	accountDetailTripLinked?: boolean
}

/**
 * Per-stage CTA cluster for account queue rows (Story 16.21 / AC3 + AC4).
 *
 * - **New** / **Triaged** → Send quote (deep-link to Quote on booking detail; on detail, smooth-scroll).
 * - **Availability checked** → Assign trip (`opsFulfilAssignBookingHref`); disabled when dispatch chip blocks.
 * - **Pending confirmation** (`surface=detail`) → same embedded **Assign trip** panel as availability checked
 *   (driver + vehicle for pickup); queue rows still use **Process Booking** → detail.
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
	totalAmountZar,
	dispatchGate,
	surface = 'queue',
	detailAssignSlot = null,
	accountDetailTripLinked = false,
}: AccountQueueRowActionsProps) {
	const [payOpen, setPayOpen] = useState(false)

	const bookingDetailHref = `/ops/bookings/${encodeURIComponent(bookingId)}`
	const quoteSectionHref = `${bookingDetailHref}#ops-booking-quote`
	const handoffInvoicingHref = '/ops/invoicing?tab=ready'

	const showProcessBooking = activeStage === 'pending_confirmation'

	const stopRowNav = (e: React.MouseEvent | React.KeyboardEvent) => {
		e.stopPropagation()
	}

	const scrollToQuote = (e: React.MouseEvent) => {
		e.stopPropagation()
		document.getElementById('ops-booking-quote')?.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		})
	}

	const dispatchBlocked = dispatchGate.kind === 'blocked'
	const blockTitle = dispatchBlocked
		? 'Dispatch is blocked for this account booking. Resolve the chip reason before continuing.'
		: undefined

	const showSendQuote = activeStage === 'new' || activeStage === 'triaged'

	return (
		<div className="flex min-w-[10rem] flex-col gap-1.5">
			{dispatchGate.kind === 'blocked' ? (
				<AccountDispatchBlockChip
					reasonCode={dispatchGate.reasonCode}
					detail={dispatchGate.detail}
				/>
			) : null}

			{showProcessBooking && surface === 'queue' ? (
				<Button type="button" size="sm" variant="default" asChild>
					<Link href={bookingDetailHref} onClick={stopRowNav}>
						Process Booking
					</Link>
				</Button>
			) : null}

			{showProcessBooking && surface === 'detail' ? (
				<div className="space-y-2">
					<p className="text-xs text-ops-muted">
						{accountDetailTripLinked ? (
							<>
								Trip driver and vehicle are recorded in <strong className="text-ops-foreground">Trip assignment</strong> above.
								Complete the <strong className="text-ops-foreground">Quote</strong> below, then{' '}
								<strong className="text-ops-foreground">Confirm booking</strong> when ready.
							</>
						) : (
							<>
								Use <strong className="text-ops-foreground">Assign trip</strong> and{' '}
								<strong className="text-ops-foreground">Quote</strong> below, then confirm the booking.
							</>
						)}
					</p>
					{dispatchBlocked ? (
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
					) : detailAssignSlot != null ? (
						<div id={OPS_BOOKING_ASSIGN_ANCHOR_ID} className="min-w-0">
							{detailAssignSlot}
						</div>
					) : accountDetailTripLinked ? null : (
						<Button type="button" size="sm" variant="default" asChild>
							<Link href={opsFulfilAssignBookingHref(bookingId)} onClick={stopRowNav}>
								Assign trip
							</Link>
						</Button>
					)}
				</div>
			) : null}

			{showSendQuote ? (
				surface === 'detail' ? (
					<Button type="button" size="sm" variant="outline" onClick={scrollToQuote}>
						Send Quote
					</Button>
				) : (
					<Button type="button" size="sm" variant="outline" asChild>
						<Link href={quoteSectionHref} onClick={stopRowNav}>
							Send Quote
						</Link>
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
				) : surface === 'detail' && detailAssignSlot != null ? (
					<div id={OPS_BOOKING_ASSIGN_ANCHOR_ID} className="min-w-0">
						{detailAssignSlot}
					</div>
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
