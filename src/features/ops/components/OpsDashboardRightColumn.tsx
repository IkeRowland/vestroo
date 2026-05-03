import Link from 'next/link'
import { AlertCircle, Car, ClipboardList, Inbox, Search } from 'lucide-react'

import { OPS_CHART_TONE_INDEX } from '@/features/ops/components/ops-chart-tones'
import type { OpsDonutSlice } from '@/features/ops/components/OpsDonutChart'
import { OpsDonutChart } from '@/features/ops/components/OpsDonutChart'
import { opsDashboardCopy } from '@/features/ops/copy/ops-dashboard-copy'
import { cn } from '@/lib/utils'

const CHROME =
	'rounded-xl border border-ops-border/70 bg-ops-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_12px_rgba(15,23,42,0.04)] sm:p-5'

const PREVIEW_BADGE =
	'shrink-0 rounded-ops-pill border border-ops-border/60 bg-ops-nav-active/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ops-muted'

const shortcut = [
	{ href: opsDashboardCopy.linkTrips.href, label: opsDashboardCopy.linkTrips.label, icon: Car },
	{ href: opsDashboardCopy.linkBookings.href, label: opsDashboardCopy.linkBookings.label, icon: ClipboardList },
	{
		href: opsDashboardCopy.linkBookingsSearch.href,
		label: opsDashboardCopy.linkBookingsSearch.label,
		icon: Search,
	},
	{ href: opsDashboardCopy.linkWalkIn.href, label: opsDashboardCopy.linkWalkIn.label, icon: Inbox },
] as const

function TripMixLegend({ slices, total }: { slices: OpsDonutSlice[]; total: number }) {
	return (
		<ul
			className="flex w-full flex-col gap-2"
			aria-label="Trip status legend"
		>
			{slices.map((s) => {
				const pct = total > 0 ? Math.round((s.value / total) * 1000) / 10 : 0
				const n = OPS_CHART_TONE_INDEX[s.tone]
				return (
					<li key={s.label} className="flex items-center justify-between gap-2 text-sm">
						<span className="flex min-w-0 items-center gap-2 text-ops-foreground">
							<span
								className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-ops-border/50"
								style={{ backgroundColor: `hsl(var(--ops-chart-${n}))` }}
								aria-hidden
							/>
							<span className="truncate">{s.label}</span>
						</span>
						<span className="shrink-0 tabular-nums text-sm font-semibold text-ops-foreground">
							{pct}%
						</span>
					</li>
				)
			})}
		</ul>
	)
}

const DONUT = 192

export type OpsDashboardRightColumnProps = {
	tripSlices: OpsDonutSlice[]
	tripTotal: number
	tripPartsSummary: string
	className?: string
}

/**
 * Wheelzie reference order: **Trip status (donut)** → **Reminders** → **Shortcuts** — right column of the dashboard.
 */
export function OpsDashboardRightColumn({
	tripSlices,
	tripTotal,
	tripPartsSummary,
	className,
}: OpsDashboardRightColumnProps) {
	const ariaDonut = opsDashboardCopy.tripMixChartAria(tripPartsSummary, tripTotal)

	return (
		<div
			data-testid="ops-dash-right-rail"
			className={cn('flex w-full min-w-0 flex-col gap-4 lg:max-w-sm xl:max-w-[20rem]', className)}
			aria-labelledby="ops-dash-right-rail-h"
		>
			<p id="ops-dash-right-rail-h" className="sr-only">
				{opsDashboardCopy.rightRailSectionHeading}
			</p>

			<div className={CHROME} aria-labelledby="ops-dash-trip-mix-title">
				<div className="flex flex-wrap items-start justify-between gap-2 border-b border-ops-border/30 pb-3">
					<div className="min-w-0">
						<h2
							id="ops-dash-trip-mix-title"
							className="text-sm font-semibold text-ops-foreground"
						>
							{opsDashboardCopy.tripMixChartTitle}
						</h2>
						<p className="mt-1 text-xs leading-relaxed text-ops-muted">
							{opsDashboardCopy.tripMixChartSummary}
						</p>
					</div>
					<span className={PREVIEW_BADGE} aria-label={opsDashboardCopy.demoBadgeAria}>
						{opsDashboardCopy.previewBadge}
					</span>
				</div>
				<div className="mt-4 flex flex-col items-center gap-4">
					<OpsDonutChart
						slices={tripSlices}
						width={DONUT}
						height={DONUT}
						ariaLabel={ariaDonut}
					>
						{tripTotal > 0 ? (
							<>
								<span className="text-2xl font-semibold tabular-nums text-ops-foreground">
									{tripTotal}
								</span>
								<span className="text-xs text-ops-muted">trips in view</span>
							</>
						) : null}
					</OpsDonutChart>
					<TripMixLegend slices={tripSlices} total={tripTotal} />
				</div>
			</div>

			<div className={CHROME}>
				<h2 className="text-sm font-semibold text-ops-foreground">
					{opsDashboardCopy.tipListTitle}
				</h2>
				<ul
					className="mt-3 space-y-3"
					aria-label={opsDashboardCopy.tipListAria}
					role="list"
				>
					{opsDashboardCopy.tipList.map((line) => (
						<li key={line} className="flex gap-2.5 text-sm leading-relaxed text-ops-muted">
							<AlertCircle
								className="mt-0.5 h-4 w-4 shrink-0 text-ops-accent"
								aria-hidden
							/>
							<span>{line}</span>
						</li>
					))}
				</ul>
			</div>

			<nav className={CHROME} aria-label={opsDashboardCopy.shortcutsLandmarkLabel}>
				<h2 className="text-sm font-semibold text-ops-foreground">{opsDashboardCopy.shortcutsTitle}</h2>
				<ul className="mt-3 space-y-0.5" role="list">
					{shortcut.map(({ href, label, icon: Icon }) => (
						<li key={href}>
							<Link
								href={href}
								className="group flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-sm text-ops-foreground transition hover:bg-ops-nav-active/50 hover:text-ops-foreground"
							>
								<Icon
									className="h-4 w-4 shrink-0 text-ops-muted group-hover:text-ops-accent"
									aria-hidden
								/>
								<span className="font-medium leading-snug">{label}</span>
							</Link>
						</li>
					))}
				</ul>
			</nav>
		</div>
	)
}
