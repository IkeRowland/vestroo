'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { acceptTripRequestBookingAction, recordBookingPaymentReceivedAction } from '@/actions/opsFulfil'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { opsActionCorrelationId, opsActionErrorMessage, isOpsActionFailure } from '@/lib/ops-action-result'

type FulfilQueueRowActionsProps = {
	queue: 'pending' | 'trip_request'
	bookingId: string
	isCancelled: boolean
	/** When set, trip request already accepted — hide accept control */
	tripRequestAcceptedAt: string | null
}

export function FulfilQueueRowActions({
	queue,
	bookingId,
	isCancelled,
	tripRequestAcceptedAt,
}: FulfilQueueRowActionsProps) {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	const cancelledId = `fulfil-cancelled-${bookingId}`
	const pendingDisabled = isCancelled || queue !== 'pending'

	async function onRecordPayment() {
		setError(null)
		setBusy(true)
		const res = await recordBookingPaymentReceivedAction({ bookingId })
		setBusy(false)
		if (!res.ok && isOpsActionFailure(res)) {
			const ref = opsActionCorrelationId(res)
			const suffix = ref ? ` Reference: ${ref.slice(0, 8)}…` : ''
			setError(`${opsActionErrorMessage(res)}${suffix}`)
			return
		}
		router.refresh()
	}

	async function onAcceptTripRequest() {
		setError(null)
		setBusy(true)
		const res = await acceptTripRequestBookingAction({ bookingId })
		setBusy(false)
		if (!res.ok && isOpsActionFailure(res)) {
			const ref = opsActionCorrelationId(res)
			const suffix = ref ? ` Reference: ${ref.slice(0, 8)}…` : ''
			setError(`${opsActionErrorMessage(res)}${suffix}`)
			return
		}
		router.refresh()
	}

	if (queue === 'pending') {
		return (
			<div className="flex min-w-[12rem] flex-col gap-1">
				{error ? (
					<Alert
						variant="destructive"
						className="border-red-900/60 bg-red-950/50 py-2 text-red-100 [&>div]:text-red-200/95"
					>
						<AlertDescription className="text-xs">{error}</AlertDescription>
					</Alert>
				) : null}
				<Button
					type="button"
					size="sm"
					disabled={pendingDisabled || busy}
					className="bg-emerald-800 text-white hover:bg-emerald-700 disabled:opacity-60"
					onClick={() => void onRecordPayment()}
					aria-describedby={isCancelled ? cancelledId : undefined}
				>
					{busy ? 'Recording…' : 'Record payment received'}
				</Button>
				{isCancelled ? (
					<p id={cancelledId} className="text-xs text-ops-muted">
						Cancelled bookings cannot be marked paid here.
					</p>
				) : (
					<p className="text-xs text-ops-muted">
						Manual or offline settlement only (EFT, cash, or other out-of-band channel).
					</p>
				)}
			</div>
		)
	}

	if (tripRequestAcceptedAt) {
		return (
			<span className="text-sm text-ops-muted">
				Accepted{' '}
				<time dateTime={tripRequestAcceptedAt}>
					{new Date(tripRequestAcceptedAt).toLocaleString()}
				</time>
			</span>
		)
	}

	return (
		<div className="flex min-w-[12rem] flex-col gap-1">
			{error ? (
				<Alert
					variant="destructive"
					className="border-red-900/60 bg-red-950/50 py-2 text-red-100 [&>div]:text-red-200/95"
				>
					<AlertDescription className="text-xs">{error}</AlertDescription>
				</Alert>
			) : null}
			<Button
				type="button"
				size="sm"
				disabled={busy}
				className="border border-ops-border bg-ops-surface text-ops-foreground hover:bg-ops-canvas disabled:opacity-60"
				onClick={() => void onAcceptTripRequest()}
			>
				{busy ? 'Saving…' : 'Mark accepted'}
			</Button>
			<p className="text-xs text-ops-muted">Confirms ops has reviewed this public trip request.</p>
		</div>
	)
}
