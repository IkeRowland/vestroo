import { opsChartsCopy } from '@/features/ops/copy/ops-charts-copy'
import { saasCls } from '@/components/saas/saas-class-names'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { cn } from '@/lib/utils'

export function ChartEmpty({
	theme = 'ops',
	className,
}: {
	theme?: SaasTheme
	className?: string
}) {
	return (
		<p
			className={cn(
				saasCls(theme, 'text-xs text-ops-muted', 'text-xs text-account-muted'),
				className,
			)}
			role="status"
		>
			{opsChartsCopy.noDataForPeriod}
		</p>
	)
}
