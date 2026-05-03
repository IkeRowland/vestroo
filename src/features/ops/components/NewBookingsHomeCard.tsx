import Link from 'next/link'
import { Inbox, Minus } from 'lucide-react'

import { opsKpiCardCopy } from '@/features/ops/copy/ops-kpi-card-copy'
import { OPS_WALK_IN_NEW_QUEUE_HREF } from '@/lib/ops-walk-in-queue-query'
import { cn } from '@/lib/utils'

/** Elevated tile on dashboard canvas (Wheelzie-style reference). */
const DEFAULT_SCORECARD_CHROME =
	'border-ops-border/80 bg-ops-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:border-ops-accent/35 hover:shadow-[0_4px_14px_rgba(15,23,42,0.09)]'

export type NewBookingsHomeCardProps = {
	needsAttentionCount: number | null
	/** When dashboard KPI queries failed, count is unavailable but the queue link must still work (E2). */
	countUnavailable?: boolean
	/** Merged onto the root card — e.g. dashboard grid chrome (Story 17.6). */
	className?: string
}

/**
 * Story 16.20 / US-A1: attention metric + deep-link into walk-in slice of **`/ops/bookings`** (`client=walk_in`, new submissions).
 * Story 17.4: scorecard chrome aligned to **`OpsKpiCard`**; data / queue links unchanged.
 */
export function NewBookingsHomeCard({
	needsAttentionCount,
	countUnavailable,
	className,
}: NewBookingsHomeCardProps) {
	const hasAttention =
		!countUnavailable && needsAttentionCount !== null && needsAttentionCount > 0

	const ctaAriaLabel = (() => {
		if (countUnavailable) {
			return 'Open the walk-in queue at the New stage; attention count unavailable'
		}
		if (needsAttentionCount === 0) {
			return 'Open the walk-in queue at the New stage; no walk-in bookings need attention'
		}
		return `Open the walk-in queue at the New stage; ${needsAttentionCount} booking${
			needsAttentionCount === 1 ? '' : 's'
		} need attention`
	})()

	return (
		<div
			data-testid="ops-home-new-bookings-card"
			className={cn(
				'relative flex min-h-[8.5rem] flex-col overflow-hidden rounded-ops-card border p-4 transition',
				hasAttention
					? 'border-primary/50 bg-primary/5 shadow-ops-1 hover:shadow-ops-2'
					: cn(DEFAULT_SCORECARD_CHROME, className),
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<Inbox className="h-4 w-4 shrink-0 text-ops-muted" aria-hidden />
					<span className="truncate text-sm font-medium text-ops-foreground">New Bookings</span>
				</div>
				{hasAttention ? (
					<span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
						Needs attention
					</span>
				) : null}
			</div>

			<div className="mt-3 flex min-h-16 flex-1 items-end justify-between gap-3">
				<div className="min-w-0 flex-1">
					{countUnavailable ? (
						<p className="text-sm text-ops-muted">
							Attention count could not be loaded. You can still open the walk-in queue.
						</p>
					) : (
						<>
							<p
								className={cn(
									'text-3xl font-semibold tabular-nums',
									hasAttention ? 'text-primary' : 'text-ops-foreground',
								)}
								aria-label={
									needsAttentionCount === 0
										? 'No walk-in bookings need attention'
										: `${needsAttentionCount} walk-in bookings need attention`
								}
							>
								{needsAttentionCount}
							</p>
							<p className="mt-2 line-clamp-2 text-xs text-ops-muted">
								Walk-in bookings that need attention from operations.
							</p>
						</>
					)}
				</div>
				<div
					className="flex h-16 min-h-[56px] max-h-[72px] w-[72px] shrink-0 flex-col items-end justify-end"
					aria-label={opsKpiCardCopy.sparklinePlaceholderAria}
					role="img"
				>
					<div className="h-12 w-full rounded-sm bg-ops-surface-active/60" aria-hidden />
				</div>
			</div>

			<div className="mt-2 flex items-center gap-1 text-sm tabular-nums text-ops-muted">
				<Minus className="h-4 w-4 shrink-0" aria-hidden />
				<span className="min-w-0 truncate">
					{opsKpiCardCopy.deltaUnavailable} · {opsKpiCardCopy.defaultPeriodLabel}
				</span>
			</div>

			<Link
				href={OPS_WALK_IN_NEW_QUEUE_HREF}
				aria-label={ctaAriaLabel}
				className="relative z-10 mt-3 inline-flex w-fit items-center text-sm font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
			>
				Open walk-in queue →
			</Link>
		</div>
	)
}
