'use client'

import Link from 'next/link'

import {
	hasActiveQueueFilters,
	isCancelledQueuePreset,
	isCompletedQueuePreset,
	isNeedsAttentionPreset,
	isReadyToAssignPreset,
	OPS_BOOKINGS_QUEUE_NEEDS_ATTENTION_STATUSES,
	OPS_BOOKINGS_READY_TO_ASSIGN_STATUS,
	opsBookingsPathWithQuery,
	type OpsBookingsQueueParsed,
} from '@/lib/ops-bookings-queue-query'
import { cn } from '@/lib/utils'

export type OpsBookingsQueuePresetCounts = {
	readyToAssign: number | null
	readyToAssignUnavailable: boolean
	needsAttention: number | null
	needsAttentionUnavailable: boolean
	completed: number | null
	completedUnavailable: boolean
	cancelled: number | null
	cancelledUnavailable: boolean
	all: number | null
	allUnavailable: boolean
}

type OpsBookingsQueuePresetChipsProps = {
	parsed: OpsBookingsQueueParsed
	counts: OpsBookingsQueuePresetCounts
}

function chipCountLabel(value: number | null, unavailable: boolean): string {
	if (unavailable) return '—'
	if (value === null) return '—'
	return String(value)
}

/**
 * URL-driven quick filters (chips) with live server counts where available (Epic 12 / 14.8).
 */
export function OpsBookingsQueuePresetChips({ parsed, counts }: OpsBookingsQueuePresetChipsProps) {
	const isAll = !hasActiveQueueFilters(parsed)
	const isAttention = isNeedsAttentionPreset(parsed)
	const isRta = isReadyToAssignPreset(parsed)
	const isCompleted = isCompletedQueuePreset(parsed)
	const isCancelled = isCancelledQueuePreset(parsed)

	const clearHref = opsBookingsPathWithQuery({
		statuses: [],
		payments: [],
		intents: [],
		clients: [],
		page: 1,
		perPage: parsed.perPage,
	})

	const needsAttentionHref = opsBookingsPathWithQuery({
		statuses: [...OPS_BOOKINGS_QUEUE_NEEDS_ATTENTION_STATUSES],
		payments: [],
		intents: [],
		clients: [],
		page: 1,
		perPage: parsed.perPage,
	})

	const completedHref = opsBookingsPathWithQuery({
		statuses: ['completed'],
		payments: [],
		intents: [],
		clients: [],
		page: 1,
		perPage: parsed.perPage,
	})

	const cancelledHref = opsBookingsPathWithQuery({
		statuses: ['cancelled'],
		payments: [],
		intents: [],
		clients: [],
		page: 1,
		perPage: parsed.perPage,
	})

	const readyToAssignHref = opsBookingsPathWithQuery({
		statuses: [OPS_BOOKINGS_READY_TO_ASSIGN_STATUS],
		payments: [],
		intents: [],
		clients: [],
		page: 1,
		perPage: parsed.perPage,
	})

	return (
		<div
			data-testid="ops-bookings-preset-chips"
			className="flex flex-wrap items-center gap-2 border-b border-ops-border bg-ops-canvas/30 px-3 py-2 sm:px-4"
		>
			<span className="text-xs font-medium uppercase tracking-wide text-ops-muted">Quick views</span>

			<Link
				data-testid="ops-bookings-all-chip"
				href={isAll ? '#' : clearHref}
				onClick={(e) => {
					if (isAll) e.preventDefault()
				}}
				className={cn(
					'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
					isAll
						? 'border-primary/50 bg-primary/10 text-ops-foreground cursor-default'
						: 'border-ops-border bg-ops-surface/60 text-ops-foreground hover:border-primary/30 hover:bg-ops-surface',
				)}
				aria-disabled={isAll}
				aria-current={isAll ? 'true' : undefined}
				aria-label={isAll ? 'Showing all bookings' : 'Clear filters — show all bookings'}
			>
				All
				<span
					className={cn(
						'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
						isAll ? 'bg-primary/20 text-ops-foreground' : 'bg-muted/80 text-ops-muted',
					)}
				>
					{chipCountLabel(counts.all, counts.allUnavailable)}
				</span>
			</Link>

			<Link
				data-testid="ops-bookings-needs-attention-chip"
				href={isAttention ? clearHref : needsAttentionHref}
				className={cn(
					'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
					isAttention
						? 'border-primary/50 bg-primary/10 text-ops-foreground'
						: 'border-ops-border bg-ops-surface/60 text-ops-foreground hover:border-primary/30 hover:bg-ops-surface',
				)}
				aria-pressed={isAttention}
				aria-label={
					isAttention
						? 'Clear Needs attention filter'
						: 'Filter to Needs attention (submitted, triaged, quote sent, awaiting payment)'
				}
			>
				Needs attention
				<span
					className={cn(
						'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
						isAttention ? 'bg-primary/20 text-ops-foreground' : 'bg-muted/80 text-ops-muted',
					)}
				>
					{chipCountLabel(counts.needsAttention, counts.needsAttentionUnavailable)}
				</span>
			</Link>

			<Link
				data-testid="ops-bookings-ready-to-assign-chip"
				href={isRta ? clearHref : readyToAssignHref}
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
				>
					{chipCountLabel(counts.readyToAssign, counts.readyToAssignUnavailable)}
				</span>
			</Link>

			<Link
				data-testid="ops-bookings-completed-chip"
				href={isCompleted ? clearHref : completedHref}
				className={cn(
					'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
					isCompleted
						? 'border-primary/50 bg-primary/10 text-ops-foreground'
						: 'border-ops-border bg-ops-surface/60 text-ops-foreground hover:border-primary/30 hover:bg-ops-surface',
				)}
				aria-pressed={isCompleted}
				aria-label={isCompleted ? 'Clear Completed filter' : 'Filter to Completed bookings'}
			>
				Completed
				<span
					className={cn(
						'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
						isCompleted ? 'bg-primary/20 text-ops-foreground' : 'bg-muted/80 text-ops-muted',
					)}
				>
					{chipCountLabel(counts.completed, counts.completedUnavailable)}
				</span>
			</Link>

			<Link
				data-testid="ops-bookings-cancelled-chip"
				href={isCancelled ? clearHref : cancelledHref}
				className={cn(
					'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
					isCancelled
						? 'border-primary/50 bg-primary/10 text-ops-foreground'
						: 'border-ops-border bg-ops-surface/60 text-ops-foreground hover:border-primary/30 hover:bg-ops-surface',
				)}
				aria-pressed={isCancelled}
				aria-label={isCancelled ? 'Clear Cancelled filter' : 'Filter to Cancelled bookings'}
			>
				Cancelled
				<span
					className={cn(
						'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
						isCancelled ? 'bg-primary/20 text-ops-foreground' : 'bg-muted/80 text-ops-muted',
					)}
				>
					{chipCountLabel(counts.cancelled, counts.cancelledUnavailable)}
				</span>
			</Link>
		</div>
	)
}
