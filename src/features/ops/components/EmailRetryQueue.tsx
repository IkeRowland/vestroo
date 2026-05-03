'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
	abandonBookingQuoteCommsRetry,
	retrySendBookingQuoteEmail,
} from '@/actions/retrySendBookingQuoteEmail'
import {
	type BookingQuoteCommsRetryCandidateRow,
	shouldShowCommsRetryStrikeWarning,
} from '@/lib/booking-quote-comms-retry'
import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'

type EmailRetryQueueProps = {
	rows: BookingQuoteCommsRetryCandidateRow[]
}

export function EmailRetryQueue({ rows }: EmailRetryQueueProps) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()
	const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

	const runRetry = (quoteId: string) => {
		setBanner(null)
		startTransition(async () => {
			const res = await retrySendBookingQuoteEmail(quoteId)
			if (res.ok) {
				setBanner({
					kind: 'ok',
					text: res.idempotent
						? 'No send needed (already up to date or duplicate request).'
						: 'Trip confirmation email was sent (or skipped in test mode).',
				})
				router.refresh()
				return
			}
			setBanner({ kind: 'error', text: res.error.message })
		})
	}

	const runAbandon = (quoteId: string) => {
		setBanner(null)
		startTransition(async () => {
			const res = await abandonBookingQuoteCommsRetry(quoteId)
			if (res.ok) {
				setBanner({
					kind: 'ok',
					text: 'Marked for manual follow-up. The row will leave this queue.',
				})
				router.refresh()
				return
			}
			setBanner({ kind: 'error', text: res.error.message })
		})
	}

	return (
		<div className="space-y-4">
			{banner ? (
				<p
					role="status"
					className={
						banner.kind === 'ok'
							? 'rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-ops-foreground'
							: 'rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-ops-foreground'
					}
				>
					{banner.text}
				</p>
			) : null}

			{rows.length === 0 ? (
				<p className="text-sm text-ops-muted" role="status">
					No quotes need comms retry right now. When Resend fails after a quote is marked{' '}
					<code className="rounded bg-muted px-1 font-mono text-xs">sent</code>, matching rows appear
					here automatically.
				</p>
			) : (
				<OpsTableShell caption="Trip confirmation comms retry queue">
					<thead className="border-b border-ops-border bg-ops-surface/60 text-ops-table-head text-xs uppercase tracking-wide text-ops-muted">
						<tr>
							<th scope="col" className="px-3 py-2 font-medium">
								Quote
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Booking
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Sent to
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Failures (since last send)
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => {
							const strike = shouldShowCommsRetryStrikeWarning(row.failure_strike_count)
							return (
								<tr
									key={row.quote_id}
									data-testid="ops-comms-retry-row"
									data-quote-id={row.quote_id}
									className="border-b border-ops-border/80 align-top"
								>
									<td className="px-3 py-2 font-mono text-xs text-ops-foreground">
										v{row.quote_version} · {row.quote_id.slice(0, 8)}…
									</td>
									<td className="px-3 py-2 text-sm">
										<Link
											href={`${OPS_BOOKINGS_PATH}/${row.booking_id}`}
											className="font-mono text-xs text-primary underline-offset-2 hover:underline"
										>
											{row.booking_id.slice(0, 8)}…
										</Link>
									</td>
									<td className="max-w-[14rem] truncate px-3 py-2 text-sm text-ops-muted">
										{row.sent_to_email ?? '—'}
									</td>
									<td className="px-3 py-2 text-sm text-ops-foreground">
										<span className="tabular-nums">{row.failure_strike_count}</span>
										{strike ? (
											<span className="ml-2 inline-flex items-center rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100">
												3+ failures — manual follow-up recommended
											</span>
										) : null}
									</td>
									<td className="space-y-2 px-3 py-2">
										<div className="flex flex-wrap gap-2">
											<button
												type="button"
												className="rounded-md border border-ops-border bg-ops-surface px-3 py-1.5 text-sm font-medium text-ops-foreground hover:bg-ops-surface-hover disabled:opacity-50"
												disabled={pending}
												onClick={() => runRetry(row.quote_id)}
											>
												Retry now
											</button>
											{strike ? (
												<button
													type="button"
													className="rounded-md border border-amber-600/50 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-ops-foreground hover:bg-amber-500/20 disabled:opacity-50"
													disabled={pending}
													onClick={() => runAbandon(row.quote_id)}
												>
													Mark failed, will contact manually
												</button>
											) : null}
										</div>
									</td>
								</tr>
							)
						})}
					</tbody>
				</OpsTableShell>
			)}
		</div>
	)
}
