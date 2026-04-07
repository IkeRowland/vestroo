import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type OpsEmptyStateProps = {
	title: string
	description: ReactNode
	/** Optional primary action (link or button) */
	action?: ReactNode
	className?: string
}

export function OpsEmptyState({
	title,
	description,
	action,
	className,
}: OpsEmptyStateProps) {
	return (
		<div
			className={cn(
				'rounded-md border border-dashed border-ops-border bg-ops-surface/20 px-4 py-8 text-center',
				className,
			)}
		>
			<p className="text-sm font-medium text-ops-foreground">{title}</p>
			<div className="mt-2 text-sm text-ops-muted">{description}</div>
			{action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
		</div>
	)
}
