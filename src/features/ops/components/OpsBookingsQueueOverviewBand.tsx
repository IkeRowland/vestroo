import type { OpsBarChartSeries } from '@/features/ops/components/OpsBarChart'
import { OpsBarChart } from '@/features/ops/components/OpsBarChart'
import { OpsKpiCard } from '@/features/ops/components/OpsKpiCard'
import { opsBookingsQueueCopy } from '@/features/ops/copy/ops-bookings-queue-copy'
import { opsChartsCopy } from '@/features/ops/copy/ops-charts-copy'
import { opsKpiCardCopy } from '@/features/ops/copy/ops-kpi-card-copy'
import { cn } from '@/lib/utils'
import { ClipboardList, Sparkles, UserCheck } from 'lucide-react'

/** Match dashboard scorecard lift (FE.17.4 / Wheelzie reference). */
const SCORECARD_CHROME =
	'border-ops-border/80 bg-ops-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:border-ops-accent/35 hover:shadow-[0_4px_14px_rgba(15,23,42,0.09)]'

const CHART_SHELL =
	'rounded-xl border border-ops-border/70 bg-ops-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors duration-200 ease-out'

export type OpsBookingsQueueOverviewBandProps = {
	/** Bookings in the current filtered queue (paged total). */
	totalInView: number
	/** Global count of `ready_to_assign` (or null if query failed). */
	readyToAssign: number | null
	readyToAssignUnavailable: boolean
	/** Bookings moved to `completed` in the last 7 days (UTC). */
	completed7d: number
	completed7dUnavailable: boolean
	barSeries: OpsBarChartSeries
	readyToAssignDrillHref: string
}

/**
 * Wheelzie **06-bookings**-style band: KPI scorecard + stacked booking overview above filters (Story 17.21).
 */
export function OpsBookingsQueueOverviewBand({
	totalInView,
	readyToAssign,
	readyToAssignUnavailable,
	completed7d,
	completed7dUnavailable,
	barSeries,
	readyToAssignDrillHref,
}: OpsBookingsQueueOverviewBandProps) {
	const rtaValue =
		readyToAssignUnavailable || readyToAssign === null
			? '—'
			: String(readyToAssign)
	const completedValue = completed7dUnavailable ? '—' : String(completed7d)

	return (
		<section
			className="space-y-5"
			aria-labelledby="ops-bq-overview-title"
		>
			<h2
				id="ops-bq-overview-title"
				className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ops-muted"
			>
				{opsBookingsQueueCopy.overviewSectionHeading}
			</h2>

			<ul
				className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3"
				aria-label={opsBookingsQueueCopy.overviewKpisLandmark}
			>
				<li>
					<OpsKpiCard
						data-testid="ops-bq-kpi-in-view"
						label={opsBookingsQueueCopy.kpiInViewLabel}
						icon={ClipboardList}
						value={totalInView}
						shortDefinition={opsBookingsQueueCopy.kpiInViewDefinition}
						drillHref={undefined}
						deltaPercent={null}
						deltaPolarity="neutral"
						periodLabel={opsKpiCardCopy.defaultPeriodLabel}
						className={SCORECARD_CHROME}
					/>
				</li>
				<li>
					<OpsKpiCard
						data-testid="ops-bq-kpi-ready"
						label={opsBookingsQueueCopy.kpiReadyToAssignLabel}
						icon={UserCheck}
						value={rtaValue}
						shortDefinition={opsBookingsQueueCopy.kpiReadyToAssignDefinition}
						drillHref={readyToAssignUnavailable ? undefined : readyToAssignDrillHref}
						deltaPercent={null}
						deltaPolarity="neutral"
						periodLabel={opsKpiCardCopy.defaultPeriodLabel}
						className={SCORECARD_CHROME}
					/>
				</li>
				<li>
					<OpsKpiCard
						data-testid="ops-bq-kpi-completed-7d"
						label={opsBookingsQueueCopy.kpiCompleted7dLabel}
						icon={Sparkles}
						value={completedValue}
						shortDefinition={opsBookingsQueueCopy.kpiCompleted7dDefinition}
						drillHref={undefined}
						deltaPercent={null}
						deltaPolarity="neutral"
						periodLabel={opsBookingsQueueCopy.kpiCompleted7dPeriodLabel}
						className={SCORECARD_CHROME}
					/>
				</li>
			</ul>

			<article
				className={cn(CHART_SHELL, 'p-4 sm:p-5')}
				aria-labelledby="ops-bq-overview-chart-title"
			>
				<div className="border-b border-ops-border/40 pb-3">
					<h3
						id="ops-bq-overview-chart-title"
						className="text-base font-semibold tracking-tight text-ops-foreground"
					>
						{opsBookingsQueueCopy.overviewChartTitle}
					</h3>
					<p className="mt-1 max-w-prose text-xs leading-relaxed text-ops-muted">
						{opsBookingsQueueCopy.overviewChartSummary}
					</p>
				</div>
				<div className="mt-4 overflow-x-auto">
					<OpsBarChart
						series={barSeries}
						width={640}
						height={168}
						segmentLabels={{ up: opsChartsCopy.barSegmentUp, down: opsChartsCopy.barSegmentDown }}
						ariaLabel={opsBookingsQueueCopy.overviewChartAria(barSeries)}
						className="mx-auto min-w-[min(100%,40rem)]"
					/>
				</div>
			</article>
		</section>
	)
}
