import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type OpsPageHeaderProps = {
	title: string
	description?: ReactNode
	/** Primary / secondary actions (e.g. `OpsActionGroup` + `Button`) */
	children?: ReactNode
	className?: string
}

export function OpsPageHeader({
	title,
	description,
	children,
	className,
}: OpsPageHeaderProps) {
	return (
		<div
			className={cn(
				'flex flex-col gap-4 border-b border-ops-border pb-4 sm:flex-row sm:items-start sm:justify-between',
				className,
			)}
		>
			<div className="min-w-0">
				<h1 className="text-ops-page-title text-ops-foreground">{title}</h1>
				{description ? (
					<div className="mt-1 max-w-3xl text-sm text-ops-muted">{description}</div>
				) : null}
			</div>
			{children ? (
				<div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
			) : null}
		</div>
	)
}
