import { cn } from '@/lib/utils'

type OpsLoadingRegionProps = {
	/** Shown to sighted users and in aria-busy region */
	label?: string
	className?: string
}

/**
 * Client-side loading affordance. Use `aria-busy` so assistive tech can distinguish from empty.
 */
export function OpsLoadingRegion({
	label = 'Loading…',
	className,
}: OpsLoadingRegionProps) {
	return (
		<div
			aria-busy="true"
			aria-live="polite"
			className={cn(
				'rounded-md border border-ops-border bg-ops-surface/30 px-4 py-6 text-center',
				className,
			)}
		>
			<p className="text-sm text-ops-muted">{label}</p>
		</div>
	)
}
