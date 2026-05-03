'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { triageWalkInBookingAction } from '@/actions/triageWalkInBooking'
import { MarkPaymentReceivedDialog } from '@/features/ops/components/mark-payment-received-dialog'
import { Button } from '@/components/ui/button'
import {
	isOpsActionFailure,
	opsActionCorrelationId,
	opsActionErrorMessage,
} from '@/lib/ops-action-result'
import { opsFulfilAssignBookingHref } from '@/lib/ops-fulfil-nav'
import type { OpsWalkInStageKey } from '@/lib/ops-walk-in-queue-query'

const B2_DISABLED_TITLE = 'Availability check UI — Theme B2'

type WalkInQueueRowActionsProps = {
	bookingId: string
	activeStage: OpsWalkInStageKey
	hasAvailabilityRoute: boolean
	totalAmountZar: number | null
	/**
	 * **`detail`** — used on `/ops/bookings/[id]`: hide self-navigation CTAs that duplicate the
	 * current page (e.g. Compose quote) and filler copy for view-only stages.
	 */
	surface?: 'queue' | 'detail'
}

export function WalkInQueueRowActions({
	bookingId,
	activeStage,
	hasAvailabilityRoute,
	totalAmountZar,
	surface = 'queue',
}: WalkInQueueRowActionsProps) {
	const router = useRouter()
	const [payOpen, setPayOpen] = useState(false)
	const [triageErr, setTriageErr] = useState<string | null>(null)
	const [triagePending, startTriage] = useTransition()

	const availabilityHref = `/ops/bookings/${encodeURIComponent(bookingId)}/availability`

	const stopRowNav = (e: React.MouseEvent | React.KeyboardEvent) => {
		e.stopPropagation()
	}

	return (
		<div className="flex min-w-[10rem] flex-col gap-1.5">
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
								const res = await triageWalkInBookingAction({ bookingId })
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
				<Button type="button" size="sm" variant="default" asChild>
					<Link href={opsFulfilAssignBookingHref(bookingId)} onClick={stopRowNav}>
						Assign trip
					</Link>
				</Button>
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
