'use client'

import Link from 'next/link'

import {
	isReadyToAssignPreset,
	OPS_BOOKINGS_READY_TO_ASSIGN_STATUS,
	opsBookingsPathWithQuery,
	type OpsBookingsQueueParsed,
} from '@/lib/ops-bookings-queue-query'
import { cn } from '@/lib/utils'

type OpsBookingsQueuePresetChipsProps = {
	parsed: OpsBookingsQueueParsed
	/** `null` when the count query failed — chip still works; show no fake count (Story 14.8). */
	readyToAssignCount: number | null
	readyToAssignCountUnavailable: boolean
}

/**
 * URL-driven quick filters (chips) with live server counts where available (Epic 12 / 14.8).
 */
export function OpsBookingsQueuePresetChips({
	parsed,
	readyToAssignCount,
	readyToAssignCountUnavailable,
}: OpsBookingsQueuePresetChipsProps) {
	const isRta = isReadyToAssignPreset(parsed)
	const readyToAssignHref = opsBookingsPathWithQuery({
		statuses: [OPS_BOOKINGS_READY_TO_ASSIGN_STATUS],
		payments: [],
		intents: [],
		clients: [],
		page: 1,
		perPage: parsed.perPage,
	})
	const countLabel = (() => {
		if (readyToAssignCountUnavailable) {
			return '—'
		}
		if (readyToAssignCount === null) {
			return '—'
		}
		return String(readyToAssignCount)
	})()

	return (
		<div
			data-testid="ops-bookings-preset-chips"
			className="flex flex-wrap items-center gap-2 border-b border-ops-border bg-ops-canvas/30 px-3 py-2 sm:px-4"
		>
			<span className="text-xs font-medium uppercase tracking-wide text-ops-muted">Quick views</span>
			<Link
				data-testid="ops-bookings-ready-to-assign-chip"
				href={
					isRta
						? opsBookingsPathWithQuery({
								statuses: [],
								payments: [],
								intents: [],
								clients: [],
								page: 1,
								perPage: parsed.perPage,
							})
						: readyToAssignHref
				}
				className={cn(
					'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
					isRta
						? 'border-primary/50 bg-primary/10 text-ops-foreground'
						: 'border-ops-border bg-ops-surface/60 text-ops-foreground hover:border-primary/30 hover:bg-ops-surface',
				)}
				aria-pressed={isRta}
				aria-label={
					isRta
						? 'Clear Ready to assign filter, show all bookings'
						: 'Filter to Ready to assign (walk-in paid, status ready_to_assign only)'
				}
			>
				Ready to assign
				<span
					className={cn(
						'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
						isRta ? 'bg-primary/20 text-ops-foreground' : 'bg-muted/80 text-ops-muted',
					)}
					aria-label={
						readyToAssignCountUnavailable
							? 'Count unavailable'
							: `Count: ${readyToAssignCount ?? 0} booking(s) with status ready_to_assign`
					}
				>
					{countLabel}
				</span>
			</Link>
			{isRta ? (
				<p className="ml-0 max-w-prose text-xs text-ops-muted sm:ml-1" role="status">
					Showing only <code className="rounded bg-muted/80 px-1 font-mono text-[10px]">ready_to_assign</code> — typical
					for walk-ins after ops records the EFT/cash settlement. Account rows at this status are
					unlikely at ship; a zero count is normal.
				</p>
			) : null}
		</div>
	)
}
