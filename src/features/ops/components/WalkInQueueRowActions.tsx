'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { MarkPaymentReceivedDialog } from '@/features/ops/components/mark-payment-received-dialog'
import { Button } from '@/components/ui/button'
import { OPS_BOOKING_ASSIGN_ANCHOR_ID } from '@/features/ops/ops-bookings-url'
import { opsFulfilAssignBookingHref } from '@/lib/ops-fulfil-nav'
import type { OpsWalkInStageKey } from '@/lib/ops-walk-in-queue-query'

type WalkInQueueRowActionsProps = {
	bookingId: string
	activeStage: OpsWalkInStageKey
	totalAmountZar: number | null
	/**
	 * **`detail`** — used on `/ops/bookings/[id]`: hide self-navigation CTAs that duplicate the
	 * current page (e.g. Compose quote) and filler copy for view-only stages.
	 */
	surface?: 'queue' | 'detail'
	/** Booking detail only: embedded assign panel (replaces **Assign trip** link). */
	detailAssignSlot?: ReactNode | null
}

export function WalkInQueueRowActions({
	bookingId,
	activeStage,
	totalAmountZar,
	surface = 'queue',
	detailAssignSlot = null,
}: WalkInQueueRowActionsProps) {
	const [payOpen, setPayOpen] = useState(false)

	const bookingDetailHref = `/ops/bookings/${encodeURIComponent(bookingId)}`
	const quoteSectionHref = `${bookingDetailHref}#ops-booking-quote`

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

	const showSendQuote = activeStage === 'new' || activeStage === 'triaged'

	return (
		<div className="flex min-w-[10rem] flex-col gap-1.5">
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

			{activeStage === 'availability_checked' && surface === 'queue' ? (
				<Button type="button" size="sm" variant="default" asChild>
					<Link href={`/ops/bookings/${encodeURIComponent(bookingId)}`} onClick={stopRowNav}>
						Compose quote
					</Link>
				</Button>
			) : null}

			{activeStage === 'availability_checked' && surface === 'detail' ? (
				<p className="text-xs text-ops-muted">
					Use the <span className="font-medium text-ops-foreground">Quote</span> section below to
					compose or send the quote.
				</p>
			) : null}

			{activeStage === 'awaiting_payment' ? (
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

			{activeStage === 'ready_to_assign' ? (
				surface === 'detail' && detailAssignSlot != null ? (
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

			{surface === 'detail' &&
			(activeStage === 'quote_sent' ||
				activeStage === 'in_progress' ||
				activeStage === 'completed') ? (
				<p className="text-xs leading-relaxed text-ops-muted">
					{activeStage === 'completed'
						? 'No further walk-in queue actions — this booking is finished from an ops perspective.'
						: activeStage === 'in_progress'
							? 'Trip is assigned or underway — use Trips or Calendar for live field status and updates.'
							: 'Awaiting customer response to the quote — use the Quote section on this page to follow up or revise.'}
				</p>
			) : null}

			{surface === 'queue' &&
			(activeStage === 'quote_sent' ||
				activeStage === 'in_progress' ||
				activeStage === 'completed') ? (
				<span className="text-xs text-ops-muted">View row / open detail</span>
			) : null}
		</div>
	)
}
