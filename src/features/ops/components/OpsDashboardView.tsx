import { NewBookingsHomeCard } from '@/features/ops/components/NewBookingsHomeCard'
import { OpsBarChart } from '@/features/ops/components/OpsBarChart'
import { OpsDashboardRightColumn } from '@/features/ops/components/OpsDashboardRightColumn'
import { OpsKpiCard } from '@/features/ops/components/OpsKpiCard'
import { OpsPageHeader } from '@/features/ops/components/OpsPageHeader'
import { OPS_DASHBOARD_KPI_ICONS } from '@/features/ops/components/ops-dashboard-kpi-icons'
import { OpsAreaChart } from '@/features/ops/components/OpsAreaChart'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { OpsSparkline } from '@/features/ops/components/OpsSparkline'
import { opsDashboardCopy } from '@/features/ops/copy/ops-dashboard-copy'
import {
	opsDashboardDemoActivityBarSeries,
	opsDashboardDemoRevenueWeekPoints,
	opsDashboardDemoSparklinePoints,
	opsDashboardTripMixSlices,
} from '@/features/ops/lib/ops-dashboard-demo-series'
import { loadOpsDashboardKpis, type OpsDashboardKpiSnapshot } from '@/lib/load-ops-dashboard-kpis'
import type { OpsDashboardKpiId } from '@/lib/ops-dashboard-kpis'
import { opsDashboardKpiDeltaPolarity } from '@/lib/ops-dashboard-kpis'

const SPARK_W = 72
const SPARK_H = 56

const REVENUE_CHART_W = 800
const REVENUE_CHART_H = 220

const ACTIVITY_BAR_W = 800
const ACTIVITY_BAR_H = 196

/**
 * Wheelzie reference: **four** top KPIs in one row, then a secondary row for extra metrics.
 */
const PRIMARY_SCORECARD_IDS: readonly OpsDashboardKpiId[] = [
	'trips_open',
	'trips_booking',
	'trips_en_route',
] as const

const SECONDARY_SCORECARD_IDS: readonly OpsDashboardKpiId[] = [
	'trips_completed_7d_utc',
	'bookings_pending_payment',
	'bookings_trip_request',
] as const

const SCORECARD_CHROME =
	'border-ops-border/80 bg-ops-surface shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_12px_rgba(15,23,42,0.04)] hover:border-ops-accent/30 hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]'

const CHART_SHELL =
	'flex h-full min-h-0 flex-col rounded-xl border border-ops-border/60 bg-ops-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_12px_rgba(15,23,42,0.04)] transition-colors duration-200 sm:p-5'

const PERIOD_PILL =
	'rounded-ops-pill border border-ops-border/70 bg-ops-canvas/90 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ops-foreground'

const PREVIEW_BADGE =
	'shrink-0 rounded-ops-pill border border-ops-border/60 bg-ops-nav-active/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ops-muted'

function pickKpisInOrder(
	kpis: OpsDashboardKpiSnapshot[],
	order: readonly OpsDashboardKpiId[],
): OpsDashboardKpiSnapshot[] {
	return order
		.map((id) => kpis.find((k) => k.id === id))
		.filter((k): k is OpsDashboardKpiSnapshot => k != null)
}

function kpiValue(
	kpis: { id: OpsDashboardKpiId; value: number }[],
	id: OpsDashboardKpiId,
): number {
	return kpis.find((k) => k.id === id)?.value ?? 0
}

function KpiListItem({ kpi }: { kpi: OpsDashboardKpiSnapshot }) {
	return (
		<li key={kpi.id}>
			<OpsKpiCard
				data-testid={`ops-kpi-${kpi.id}`}
				label={kpi.title}
				icon={OPS_DASHBOARD_KPI_ICONS[kpi.id]}
				value={kpi.value}
				shortDefinition={kpi.shortDefinition}
				drillHref={kpi.drillHref}
				deltaPercent={null}
				deltaPolarity={opsDashboardKpiDeltaPolarity(kpi.id)}
				className={SCORECARD_CHROME}
				sparkline={
					<OpsSparkline
						points={opsDashboardDemoSparklinePoints(kpi.id, kpi.value)}
						width={SPARK_W}
						height={SPARK_H}
						ariaLabel={opsDashboardCopy.sparklineAria(kpi.title)}
					/>
				}
			/>
		</li>
	)
}

export async function OpsDashboardView() {
	const result = await loadOpsDashboardKpis()

	if (!result.ok) {
		return (
			<div className="min-w-0 max-w-full space-y-6">
				<OpsPageHeader title="Dashboard" />
				<section aria-labelledby="ops-dash-overview-title">
					<h2
						id="ops-dash-overview-title"
						className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ops-muted"
					>
						{opsDashboardCopy.overviewSectionHeading}
					</h2>
					<ul
						className="mt-4 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4"
						aria-label={opsDashboardCopy.scorecardsLandmarkLabel}
					>
						<li>
							<NewBookingsHomeCard needsAttentionCount={null} countUnavailable />
						</li>
					</ul>
				</section>
				<div>
					<OpsFetchErrorIsland
						title="Dashboard could not be loaded"
						message="Metrics could not be loaded. Try refreshing. If this persists, contact support with the reference id."
						correlationId={result.correlationId}
					/>
				</div>
			</div>
		)
	}

	const primaryKpis = pickKpisInOrder(result.kpis, PRIMARY_SCORECARD_IDS)
	const secondaryKpis = pickKpisInOrder(result.kpis, SECONDARY_SCORECARD_IDS)

	const revenuePoints = opsDashboardDemoRevenueWeekPoints()
	const activityBarSeries = opsDashboardDemoActivityBarSeries()
	const tripSlices = opsDashboardTripMixSlices({
		trips_en_route: kpiValue(result.kpis, 'trips_en_route'),
		trips_booking: kpiValue(result.kpis, 'trips_booking'),
		trips_completed_7d_utc: kpiValue(result.kpis, 'trips_completed_7d_utc'),
	})
	const tripTotal = tripSlices.reduce((acc, s) => acc + s.value, 0)
	const tripPartsSummary = tripSlices.map((s) => `${s.label} ${s.value}`).join(', ')

	return (
		<div className="min-w-0 max-w-full">
			<OpsPageHeader title="Dashboard" />

			<OpsDataFreshnessBar
				className="mt-5 rounded-xl border border-ops-border/50 bg-ops-surface py-2.5 shadow-sm"
				fetchedAtIso={result.fetchedAtIso}
			/>

			<section
				className="mt-6 space-y-4 lg:mt-8"
				aria-labelledby="ops-dash-overview-title"
			>
				<h2
					id="ops-dash-overview-title"
					className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ops-muted"
				>
					{opsDashboardCopy.overviewSectionHeading}
				</h2>
				<ul
					className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4"
					aria-label={opsDashboardCopy.scorecardsLandmarkLabel}
				>
					<li>
						<NewBookingsHomeCard
							needsAttentionCount={result.newBookingsNeedsAttentionCount}
						/>
					</li>
					{primaryKpis.map((kpi) => (
						<KpiListItem key={kpi.id} kpi={kpi} />
					))}
				</ul>
				{secondaryKpis.length > 0 ? (
					<ul
						className="mt-1 grid list-none gap-4 sm:grid-cols-2 lg:mt-2 lg:grid-cols-3"
						aria-label={`${opsDashboardCopy.scorecardsLandmarkLabel} — more metrics`}
					>
						{secondaryKpis.map((kpi) => (
							<KpiListItem key={kpi.id} kpi={kpi} />
						))}
					</ul>
				) : null}
			</section>

			<section className="mt-8" aria-labelledby="ops-dash-charts-title">
				<h2
					id="ops-dash-charts-title"
					className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ops-muted"
				>
					{opsDashboardCopy.chartsSectionHeading}
				</h2>

				<div className="mt-4 flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-6 xl:gap-8">
					<div className="min-w-0 flex-1 space-y-5">
						<article
							className={CHART_SHELL}
							aria-labelledby="ops-dash-revenue-title"
						>
							<div className="flex flex-wrap items-start justify-between gap-2 border-b border-ops-border/30 pb-3 sm:pb-4">
								<div className="min-w-0 flex-1">
									<h3
										id="ops-dash-revenue-title"
										className="font-display text-lg font-semibold tracking-tight text-ops-foreground"
									>
										{opsDashboardCopy.revenueChartTitle}
									</h3>
									<p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ops-muted sm:line-clamp-none">
										{opsDashboardCopy.revenueChartSummary}
									</p>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									<span className={PERIOD_PILL}>{opsDashboardCopy.revenuePeriodPill}</span>
									<span className={PREVIEW_BADGE} aria-label={opsDashboardCopy.demoBadgeAria}>
										{opsDashboardCopy.previewBadge}
									</span>
								</div>
							</div>
							<div className="mt-4 overflow-x-auto sm:mt-5">
								<OpsAreaChart
									points={revenuePoints}
									width={REVENUE_CHART_W}
									height={REVENUE_CHART_H}
									ariaLabel={opsDashboardCopy.revenueChartAria}
									className="mx-auto w-full min-w-[min(100%,50rem)] max-w-full text-ops-accent"
								/>
							</div>
						</article>

						<article
							className={CHART_SHELL}
							aria-labelledby="ops-dash-activity-title"
						>
							<div className="flex flex-wrap items-start justify-between gap-2 border-b border-ops-border/30 pb-3 sm:pb-4">
								<div className="min-w-0 flex-1">
									<h3
										id="ops-dash-activity-title"
										className="font-display text-lg font-semibold tracking-tight text-ops-foreground"
									>
										{opsDashboardCopy.activityBarTitle}
									</h3>
									<p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ops-muted sm:line-clamp-none">
										{opsDashboardCopy.activityBarSummary}
									</p>
								</div>
								<span className={PREVIEW_BADGE} aria-label={opsDashboardCopy.demoBadgeAria}>
									{opsDashboardCopy.previewBadge}
								</span>
							</div>
							<div className="mt-4 overflow-x-auto sm:mt-5">
								<OpsBarChart
									series={activityBarSeries}
									width={ACTIVITY_BAR_W}
									height={ACTIVITY_BAR_H}
									legend
									segmentLabels={{
										up: opsDashboardCopy.activityBarSegmentUp,
										down: opsDashboardCopy.activityBarSegmentDown,
									}}
									ariaLabel={opsDashboardCopy.activityBarAria(activityBarSeries.label)}
									className="mx-auto w-full min-w-[min(100%,50rem)] max-w-full"
								/>
							</div>
						</article>
					</div>

					<OpsDashboardRightColumn
						tripSlices={tripSlices}
						tripTotal={tripTotal}
						tripPartsSummary={tripPartsSummary}
						className="lg:sticky lg:top-4 lg:max-w-none lg:self-start xl:w-[22rem]"
					/>
				</div>
			</section>
		</div>
	)
}
