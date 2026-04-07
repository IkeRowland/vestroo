import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { opsDataRetryHint } from '@/features/ops/ops-list-state-copy'
import { cn } from '@/lib/utils'

type OpsErrorStateProps = {
	title?: string
	message: string
	/** Optional client retry (e.g. `router.refresh`) */
	onRetry?: () => void
	retryLabel?: string
	className?: string
}

/**
 * Recoverable error surface for ops data regions (list/table fetch failures).
 */
export function OpsErrorState({
	title = 'Could not load this data',
	message,
	onRetry,
	retryLabel = 'Try again',
	className,
}: OpsErrorStateProps) {
	return (
		<Alert
			variant="destructive"
			role="alert"
			className={cn(
				'border-red-900/60 bg-red-950/50 text-red-100',
				className,
			)}
		>
			<div className="text-sm">
				<p className="font-medium text-red-100">{title}</p>
				<p className="mt-1 text-red-200/95">{message}</p>
				<p className="mt-2 text-xs text-red-200/80">{opsDataRetryHint()}</p>
				{onRetry ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-3 border-red-800/80 bg-transparent text-red-100 hover:bg-red-950/80"
						onClick={onRetry}
					>
						{retryLabel}
					</Button>
				) : null}
			</div>
		</Alert>
	)
}
