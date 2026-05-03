import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type OpsCardGridProps = {
	children: ReactNode
	className?: string
}

/**
 * Generic responsive card grid (**FE.17.6**) for **`/ops/*`** surfaces — Wheelzie **7** density.
 * Consumers render **`OpsCardGrid`** → card **`role="listitem"`** children (or wrap each card).
 */
export function OpsCardGrid({ children, className }: OpsCardGridProps) {
	return (
		<div
			role="list"
			className={cn(
				'grid gap-4 sm:grid-cols-2 xl:grid-cols-3',
				className,
			)}
		>
			{children}
		</div>
	)
}
