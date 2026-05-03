import Link from 'next/link'

import type { FulfilQueueBucket } from '@/lib/fulfil-queue-buckets'
import { FULFIL_QUEUE_TABS } from '@/lib/fulfil-queue-buckets'
import { opsFulfilQueueHref } from '@/lib/ops-fulfil-nav'
import { cn } from '@/lib/utils'

type FulfilQueueTabsProps = {
	active: FulfilQueueBucket
	/** Preserved on tab changes when pre-opened from a deep link (e.g. booking row). */
	focusBookingId?: string | null
}

export function FulfilQueueTabs({ active, focusBookingId = null }: FulfilQueueTabsProps) {
	return (
		<div
			className="flex flex-wrap gap-1 rounded-lg border border-ops-border bg-ops-canvas/50 p-1"
			role="tablist"
			aria-label="Fulfil queue"
		>
			{FULFIL_QUEUE_TABS.map((tab) => {
				const isActive = tab.id === active
				return (
					<Link
						key={tab.id}
						href={opsFulfilQueueHref(tab.id, { focusBookingId })}
						role="tab"
						aria-selected={isActive}
						className={cn(
							'rounded-md px-3 py-2 text-sm font-medium transition-colors',
							isActive
								? 'bg-ops-surface text-ops-foreground shadow-sm'
								: 'text-ops-muted hover:bg-ops-surface/60 hover:text-ops-foreground',
						)}
					>
						{tab.label}
					</Link>
				)
			})}
		</div>
	)
}
