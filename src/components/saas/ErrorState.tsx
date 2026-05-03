import Link from 'next/link'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { mapOpsActionErrorToMessage } from '@/features/ops/ops-action-errors'
import { opsDataRetryHint } from '@/features/ops/ops-list-state-copy'
import { cn } from '@/lib/utils'

export type ErrorStateVariant = 'default' | 'subscription'

type SecondaryNavAction = {
	label: string
	href: string
}

export type ErrorStateProps = {
	theme?: 'ops' | 'account'
	title?: string
	message: string
	sanitizeMessage?: boolean
	variant?: ErrorStateVariant
	onRetry?: () => void
	retryLabel?: string
	secondaryAction?: SecondaryNavAction
	onRefresh?: () => void
	refreshLabel?: string
	correlationId?: string
	className?: string
}

/**
 * Recoverable error surface — destructive/subscription chroma unchanged across themes (a11y).
 * Optional **`theme`** reserved for future neutral chrome tweaks on account (**FE.18.13**).
 */
export function ErrorState({
	title = 'Could not load this data',
	message,
	sanitizeMessage = true,
	variant = 'default',
	onRetry,
	retryLabel = 'Try again',
	secondaryAction,
	onRefresh,
	refreshLabel = 'Refresh page',
	correlationId,
	className,
}: ErrorStateProps) {
	const safeMessage = sanitizeMessage ? mapOpsActionErrorToMessage(message) : message
	const isSubscription = variant === 'subscription'
	const displayTitle = isSubscription ? 'Live updates interrupted' : title

	const btnClass = isSubscription
		? 'border-amber-800/80 bg-transparent text-amber-50 hover:bg-amber-950/80'
		: 'border-red-800/80 bg-transparent text-red-100 hover:bg-red-950/80'

	return (
		<Alert
			variant={isSubscription ? 'default' : 'destructive'}
			role="alert"
			className={cn(
				!isSubscription && 'border-red-900/60 bg-red-950/50 text-red-100',
				isSubscription && 'border-amber-800/60 bg-amber-950/45 text-amber-50',
				className,
			)}
		>
			<div className="text-sm">
				<p className={cn('font-medium', !isSubscription && 'text-red-100', isSubscription && 'text-amber-100')}>
					{displayTitle}
				</p>
				<p className={cn('mt-1', !isSubscription && 'text-red-200/95', isSubscription && 'text-amber-100/90')}>
					{safeMessage}
				</p>
				{correlationId ? (
					<p
						className={cn(
							'mt-2 font-mono text-xs',
							!isSubscription && 'text-red-200/75',
							isSubscription && 'text-amber-100/75',
						)}
					>
						Reference: {correlationId.slice(0, 8)}…
					</p>
				) : null}
				<p
					className={cn('mt-2 text-xs', !isSubscription && 'text-red-200/80', isSubscription && 'text-amber-100/80')}
				>
					{opsDataRetryHint()}
				</p>
				<div className="mt-3 flex flex-wrap gap-2">
					{onRetry ? (
						<Button type="button" variant="outline" size="sm" className={btnClass} onClick={onRetry}>
							{retryLabel}
						</Button>
					) : null}
					{onRefresh ? (
						<Button type="button" variant="outline" size="sm" className={btnClass} onClick={onRefresh}>
							{refreshLabel}
						</Button>
					) : null}
					{secondaryAction ? (
						<Button type="button" variant="outline" size="sm" className={btnClass} asChild>
							<Link href={secondaryAction.href}>{secondaryAction.label}</Link>
						</Button>
					) : null}
				</div>
			</div>
		</Alert>
	)
}
