import { saasCls } from '@/components/saas/saas-class-names'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { cn } from '@/lib/utils'

export type LoadingRegionProps = {
	theme?: SaasTheme
	label?: string
	className?: string
}

export function LoadingRegion({
	theme = 'ops',
	label = 'Loading…',
	className,
}: LoadingRegionProps) {
	const box = saasCls(
		theme,
		'rounded-md border border-ops-border bg-ops-surface/30 px-4 py-6 text-center',
		'rounded-md border border-account-border bg-account-surface/30 px-4 py-6 text-center',
	)
	const text = saasCls(theme, 'text-sm text-ops-muted', 'text-sm text-account-muted')

	return (
		<div aria-busy="true" aria-live="polite" className={cn(box, className)}>
			<p className={text}>{label}</p>
		</div>
	)
}
