'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { confirmAccountClientBookingFromOps } from '@/actions/confirmAccountClientBookingFromOps'
import { Button } from '@/components/ui/button'
import { opsActionCorrelationId, opsActionErrorMessage, isOpsActionFailure } from '@/lib/ops-action-result'

type Props = {
	bookingId: string
	canConfirm: boolean
	missingTrip: boolean
	missingQuote: boolean
	/** When a row exists but fails pickup-window / availability checks (server action enforces the same). */
	tripReadinessMessage?: string | null
}

/**
 * Ops booking detail — final gate for portal **`pending_confirmation`** rows (trip + quote → `assigned`).
 */
export function OpsAccountBookingConfirmSection({
	bookingId,
	canConfirm,
	missingTrip,
	missingQuote,
	tripReadinessMessage = null,
}: Props) {
	const router = useRouter()
	const [pending, start] = useTransition()
	const [err, setErr] = useState<string | null>(null)

	return (
		<section
			className="rounded-lg border border-ops-border bg-ops-surface/50 px-4 py-3"
			aria-label="Confirm account booking"
		>
			<h2 className="text-sm font-semibold text-ops-foreground">Confirm booking</h2>
			<p className="mt-1 text-xs text-ops-muted">
				When a driver is assigned and a quote is saved, confirm so the organisation sees the booking as
				confirmed in their portal.
			</p>
			<ul className="mt-2 list-inside list-disc text-xs text-ops-muted">
				<li
					className={
						missingTrip || Boolean(tripReadinessMessage && tripReadinessMessage.length > 0)
							? 'text-amber-200'
							: ''
					}
				>
					{missingTrip
						? 'Assign a trip and driver (above).'
						: tripReadinessMessage && tripReadinessMessage.length > 0
							? tripReadinessMessage
							: 'Trip assigned for this booking’s pickup window.'}
				</li>
				<li className={missingQuote ? 'text-amber-200' : ''}>
					{missingQuote ? 'Save a quote draft in the Quote section.' : 'Quote saved.'}
				</li>
			</ul>
			<div className="mt-3">
				<Button
					type="button"
					size="sm"
					disabled={!canConfirm || pending}
					onClick={() => {
						setErr(null)
						start(async () => {
							const res = await confirmAccountClientBookingFromOps({ bookingId })
							if (!isOpsActionFailure(res)) {
								router.refresh()
								return
							}
							const ref = opsActionCorrelationId(res)
							const suffix = ref ? ` (${ref.slice(0, 8)}…)` : ''
							setErr(`${opsActionErrorMessage(res)}${suffix}`)
						})
					}}
				>
					{pending ? 'Confirming…' : 'Confirm booking'}
				</Button>
			</div>
			{err ? (
				<p className="mt-2 text-xs text-destructive" role="alert">
					{err}
				</p>
			) : null}
		</section>
	)
}
