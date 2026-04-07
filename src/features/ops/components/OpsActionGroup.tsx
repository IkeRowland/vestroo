import { cn } from '@/lib/utils'

type OpsActionGroupProps = {
	children: React.ReactNode
	className?: string
	'aria-label'?: string
}

export function OpsActionGroup({
	children,
	className,
	'aria-label': ariaLabel = 'Page actions',
}: OpsActionGroupProps) {
	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className={cn('inline-flex flex-wrap items-center gap-2', className)}
		>
			{children}
		</div>
	)
}
