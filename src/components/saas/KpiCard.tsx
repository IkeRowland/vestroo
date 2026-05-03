import Link from 'next/link'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { KpiCardOverflowMenu } from '@/components/saas/KpiCardOverflowMenu'
import { saasCls } from '@/components/saas/saas-class-names'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { opsKpiCardCopy } from '@/features/ops/copy/ops-kpi-card-copy'
import type { OpsKpiDeltaPolarity } from '@/lib/ops-dashboard-kpis'
import { cn } from '@/lib/utils'

function deltaRowToneClass(
	theme: SaasTheme,
	deltaPercent: number | null,
	polarity: OpsKpiDeltaPolarity,
): string {
	if (deltaPercent === null) {
		return saasCls(theme, 'text-ops-muted', 'text-account-muted')
	}
	if (deltaPercent === 0 || Number.isNaN(deltaPercent)) {
		return saasCls(theme, 'text-ops-muted', 'text-account-muted')
	}
	const up = deltaPercent > 0
	if (polarity === 'neutral') {
		return saasCls(theme, 'text-ops-muted', 'text-account-muted')
	}
	if (polarity === 'upGood') {
		return up
			? saasCls(theme, 'text-ops-success', 'text-account-success')
			: saasCls(theme, 'text-ops-danger', 'text-account-danger')
	}
	return up
		? saasCls(theme, 'text-ops-danger', 'text-account-danger')
		: saasCls(theme, 'text-ops-success', 'text-account-success')
}

export type KpiCardProps = {
	theme?: SaasTheme
	label: string
	icon: LucideIcon
	value: number | string
	valueSuffix?: string
	shortDefinition?: string
	loading?: boolean
	drillHref?: string
	deltaPercent: number | null
	periodLabel?: string
	deltaPolarity: OpsKpiDeltaPolarity
	sparkline?: ReactNode
	/**
	 * Account / ops scorecards with **value + descriptor only** — hides WoW delta row and sparkline band (**FE.18.3**).
	 */
	scorecardOnly?: boolean
	className?: string
	'data-testid'?: string
}

/** Wheelzie-inspired scorecard — FE.17.4 / FE.18.13 */
export function KpiCard({
	theme = 'ops',
	label,
	icon: Icon,
	value,
	valueSuffix,
	shortDefinition,
	loading = false,
	drillHref,
	deltaPercent,
	periodLabel = opsKpiCardCopy.defaultPeriodLabel,
	deltaPolarity,
	sparkline,
	scorecardOnly = false,
	className,
	'data-testid': dataTestId,
}: KpiCardProps) {
	const valueSummary = [typeof value === 'number' ? String(value) : value, valueSuffix]
		.filter(Boolean)
		.join(' ')
	const navAria = opsKpiCardCopy.cardLinkAria(label, valueSummary)
	const toneClass = deltaRowToneClass(theme, deltaPercent, deltaPolarity)

	const DeltaIcon =
		deltaPercent === null || deltaPercent === 0 || Number.isNaN(deltaPercent)
			? Minus
			: deltaPercent > 0
				? TrendingUp
				: TrendingDown

	const deltaDisplay =
		deltaPercent === null || Number.isNaN(deltaPercent)
			? opsKpiCardCopy.deltaUnavailable
			: `${deltaPercent > 0 ? '+' : ''}${deltaPercent}%`

	const cardShell = cn(
		saasCls(
			theme,
			'relative flex flex-col overflow-hidden rounded-ops-card border border-ops-border bg-ops-surface/50 shadow-ops-1 transition hover:border-primary/40 hover:shadow-ops-2',
			'relative flex flex-col overflow-hidden rounded-account-card border border-account-border bg-account-surface/50 shadow-account-1 transition hover:border-primary/40 hover:shadow-account-2',
		),
		scorecardOnly ? 'min-h-[6.5rem]' : 'min-h-[8.5rem]',
	)
	const linkRing = saasCls(
		theme,
		'absolute inset-0 z-0 rounded-ops-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
		'absolute inset-0 z-0 rounded-account-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas',
	)
	const iconMuted = saasCls(theme, 'text-ops-muted', 'text-account-muted')
	const fg = saasCls(theme, 'text-ops-foreground', 'text-account-foreground')
	const valueMuted = saasCls(theme, 'text-ops-muted', 'text-account-muted')
	const pulseBg = saasCls(theme, 'bg-ops-surface-active', 'bg-account-surface-active')
	const sparkPlaceholder = saasCls(theme, 'bg-ops-surface-active/60', 'bg-account-surface-active/60')
	const periodMuted = saasCls(theme, 'text-ops-muted', 'text-account-muted')

	return (
		<div data-testid={dataTestId} aria-busy={loading} className={cn(cardShell, className)}>
			{drillHref ? (
				<Link href={drillHref} className={linkRing} aria-label={navAria} />
			) : null}

			<div
				className={cn(
					'relative z-10 flex flex-1 flex-col p-4',
					drillHref ? 'pointer-events-none' : undefined,
				)}
			>
				<div className="flex items-start justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<Icon className={cn('h-4 w-4 shrink-0', iconMuted)} aria-hidden />
						<span className={cn('truncate text-sm font-medium', fg)}>{label}</span>
					</div>
					{drillHref ? (
						<div className="pointer-events-auto">
							<KpiCardOverflowMenu theme={theme} drillHref={drillHref} metricLabel={label} />
						</div>
					) : null}
				</div>

				<div
					className={cn(
						'mt-3 flex items-end justify-between gap-3',
						scorecardOnly ? 'min-h-0' : 'min-h-16',
					)}
				>
					<div className="min-w-0 flex-1">
						{loading ? (
							<div className={cn('h-9 w-24 animate-pulse rounded-md', pulseBg)} aria-hidden />
						) : (
							<p
								className={cn('text-3xl font-semibold tabular-nums', fg)}
								aria-label={`${label}: ${valueSummary}`}
							>
								{value}
								{valueSuffix ? (
									<span className={cn('ml-1 text-lg font-semibold', valueMuted)}>
										{valueSuffix}
									</span>
								) : null}
							</p>
						)}
						{shortDefinition ? (
							<p className={cn('mt-2 line-clamp-2 text-xs', valueMuted)}>{shortDefinition}</p>
						) : null}
					</div>

					{scorecardOnly ? null : (
						<div
							className="flex h-16 min-h-[56px] max-h-[72px] w-[72px] shrink-0 flex-col items-end justify-end"
							{...(sparkline
								? {}
								: { 'aria-label': opsKpiCardCopy.sparklinePlaceholderAria, role: 'img' })}
						>
							{sparkline ?? (
								<div className={cn('h-12 w-full rounded-sm', sparkPlaceholder)} aria-hidden />
							)}
						</div>
					)}
				</div>

				{scorecardOnly ? null : (
					<div className={cn('mt-2 flex items-center gap-1 text-sm tabular-nums', toneClass)}>
						<DeltaIcon className="h-4 w-4 shrink-0" aria-hidden />
						<span className="min-w-0 truncate">
							<span>{deltaDisplay}</span>
							<span className={periodMuted}> · {periodLabel}</span>
						</span>
					</div>
				)}
			</div>
		</div>
	)
}
