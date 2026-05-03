import type { ReactNode } from 'react'

import { saasCls } from '@/components/saas/saas-class-names'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { cn } from '@/lib/utils'

export type EmptyStateProps = {
	theme?: SaasTheme
	title: string
	description: ReactNode
	action?: ReactNode
	className?: string
}

export function EmptyState({ theme = 'ops', title, description, action, className }: EmptyStateProps) {
	const wrap = saasCls(
		theme,
		'rounded-md border border-dashed border-ops-border bg-ops-surface/20 px-4 py-8 text-center',
		'rounded-md border border-dashed border-account-border bg-account-surface/20 px-4 py-8 text-center',
	)
	const titleFg = saasCls(theme, 'text-ops-foreground', 'text-account-foreground')
	const descFg = saasCls(theme, 'text-ops-muted', 'text-account-muted')

	return (
		<div className={cn(wrap, className)}>
			<p className={cn('text-sm font-medium', titleFg)}>{title}</p>
			<div className={cn('mt-2 text-sm', descFg)}>{description}</div>
			{action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
		</div>
	)
}
