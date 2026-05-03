import { OpsKpiCard } from '@/features/ops/components/OpsKpiCard'
import { OpsSparkline } from '@/features/ops/components/OpsSparkline'
import { opsInvoicingCopy } from '@/features/ops/copy/ops-invoicing-copy'
import { opsInvoicingDemoSparklinePoints } from '@/features/ops/lib/ops-invoicing-sparkline'
import { opsKpiCardCopy } from '@/features/ops/copy/ops-kpi-card-copy'
import type { OpsInvoicingKpiSnapshot } from '@/lib/ops-invoicing-kpis'
import { OPS_INVOICING_PATH } from '@/lib/ops-invoicing-url'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

const SCORECARD_CHROME =
	'border-ops-border/80 bg-ops-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:border-ops-accent/35 hover:shadow-[0_4px_14px_rgba(15,23,42,0.09)]'

const SPARK_W = 72
const SPARK_H = 56

export type OpsInvoicingKpiBandProps = {
	snapshot: OpsInvoicingKpiSnapshot
}

function formatKpiValue(n: number | null, errored: boolean): number | string {
	if (errored) return '—'
	if (n === null) return '—'
	return n
}

/**
 * Wheelzie **Payments**-style KPI strip (**Completed / Awaiting / Overdue**) above the invoicing queue.
 */
export function OpsInvoicingKpiBand({ snapshot }: OpsInvoicingKpiBandProps) {
	const readyVal = formatKpiValue(snapshot.readyCount, snapshot.readyError)
	const awaitingVal = formatKpiValue(snapshot.awaitingCount, snapshot.awaitingError)
	const overdueVal = formatKpiValue(snapshot.overdueCount, snapshot.overdueError)

	const readyNum =
		snapshot.readyError || snapshot.readyCount === null ? 0 : snapshot.readyCount
	const awaitingNum =
		snapshot.awaitingError || snapshot.awaitingCount === null ? 0 : snapshot.awaitingCount
	const overdueNum =
		snapshot.overdueError || snapshot.overdueCount === null ? 0 : snapshot.overdueCount

	return (
		<section className="space-y-3" aria-labelledby="ops-invoicing-kpi-heading">
			<h2
				id="ops-invoicing-kpi-heading"
				className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ops-muted"
			>
				{opsInvoicingCopy.kpiSectionHeading}
			</h2>
			<ul
				className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3"
				aria-label={opsInvoicingCopy.kpiLandmarkLabel}
			>
				<li>
					<OpsKpiCard
						data-testid="ops-invoicing-kpi-completed"
						label={opsInvoicingCopy.kpiCompletedLabel}
						icon={CheckCircle2}
						value={readyVal}
						shortDefinition={opsInvoicingCopy.kpiCompletedShortDefinition}
						drillHref={snapshot.readyError ? undefined : OPS_INVOICING_PATH}
						deltaPercent={null}
						deltaPolarity="neutral"
						periodLabel={opsKpiCardCopy.defaultPeriodLabel}
						className={SCORECARD_CHROME}
						sparkline={
							snapshot.readyError ? undefined : (
								<OpsSparkline
									points={opsInvoicingDemoSparklinePoints('completed', readyNum)}
									width={SPARK_W}
									height={SPARK_H}
									ariaLabel={opsInvoicingCopy.sparklineAria(opsInvoicingCopy.kpiCompletedLabel)}
								/>
							)
						}
					/>
				</li>
				<li>
					<OpsKpiCard
						data-testid="ops-invoicing-kpi-awaiting"
						label={opsInvoicingCopy.kpiAwaitingLabel}
						icon={Clock}
						value={awaitingVal}
						shortDefinition={opsInvoicingCopy.kpiAwaitingShortDefinition}
						drillHref={
							snapshot.awaitingError ? undefined : `${OPS_INVOICING_PATH}?tab=invoiced`
						}
						deltaPercent={null}
						deltaPolarity="neutral"
						periodLabel={opsKpiCardCopy.defaultPeriodLabel}
						className={SCORECARD_CHROME}
						sparkline={
							snapshot.awaitingError ? undefined : (
								<OpsSparkline
									points={opsInvoicingDemoSparklinePoints('awaiting', awaitingNum)}
									width={SPARK_W}
									height={SPARK_H}
									ariaLabel={opsInvoicingCopy.sparklineAria(opsInvoicingCopy.kpiAwaitingLabel)}
								/>
							)
						}
					/>
				</li>
				<li>
					<OpsKpiCard
						data-testid="ops-invoicing-kpi-overdue"
						label={opsInvoicingCopy.kpiOverdueLabel}
						icon={AlertTriangle}
						value={overdueVal}
						shortDefinition={
							snapshot.overdueScanCapped ?
								`${opsInvoicingCopy.kpiOverdueShortDefinition} Overdue count is computed from the most recent invoiced rows scanned (see parity §17.16).`
							:	opsInvoicingCopy.kpiOverdueShortDefinition}
						drillHref={
							snapshot.overdueError ? undefined : `${OPS_INVOICING_PATH}?tab=invoiced`
						}
						deltaPercent={null}
						deltaPolarity="upBad"
						periodLabel={opsKpiCardCopy.defaultPeriodLabel}
						className={SCORECARD_CHROME}
						sparkline={
							snapshot.overdueError ? undefined : (
								<OpsSparkline
									points={opsInvoicingDemoSparklinePoints('overdue', overdueNum)}
									width={SPARK_W}
									height={SPARK_H}
									className="text-ops-danger"
									ariaLabel={opsInvoicingCopy.sparklineAria(opsInvoicingCopy.kpiOverdueLabel)}
								/>
							)
						}
					/>
				</li>
			</ul>
		</section>
	)
}
