import { cn } from '@/lib/utils'

type OpsTableShellProps = {
	children: React.ReactNode
	/** Visually hidden caption for screen readers */
	caption?: string
	/** Scroll / border wrapper */
	className?: string
	tableClassName?: string
}

export function OpsTableShell({
	children,
	caption,
	className,
	tableClassName,
}: OpsTableShellProps) {
	return (
		<div
			className={cn(
				'overflow-x-auto rounded-md border border-ops-border bg-ops-surface/20',
				className,
			)}
		>
			<table
				className={cn(
					'w-full min-w-[40rem] border-collapse text-left text-ops-table-body text-ops-foreground',
					tableClassName,
				)}
			>
				{caption ? <caption className="sr-only">{caption}</caption> : null}
				{children}
			</table>
		</div>
	)
}
