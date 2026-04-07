import { cn } from '@/lib/utils'

type OpsFilterRowProps = {
	children: React.ReactNode
	className?: string
	/** Defaults to "Filters" */
	'aria-label'?: string
}

export function OpsFilterRow({
	children,
	className,
	'aria-label': ariaLabel = 'Filters',
}: OpsFilterRowProps) {
	return (
		<div
			role="toolbar"
			aria-label={ariaLabel}
			className={cn(
				'flex flex-wrap items-center gap-2 border-b border-ops-border bg-ops-surface/40 py-3',
				className,
			)}
		>
			{children}
		</div>
	)
}
