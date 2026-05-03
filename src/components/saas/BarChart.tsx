import type { ReactNode } from 'react'

import { ChartEmpty } from '@/components/saas/ChartEmpty'
import { CHART_TONE_INDEX, saasChartHslVar } from '@/components/saas/chart-tones'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { clampNonNegative, formatSvgNumber } from '@/components/saas/chart-utils'
import { opsChartsCopy } from '@/features/ops/copy/ops-charts-copy'
import { cn } from '@/lib/utils'

export type BarChartSeries = {
	label: string
	values: { x: string; up: number; down: number }[]
}

export type BarChartProps = {
	theme?: SaasTheme
	series: BarChartSeries
	width: number
	height: number
	legend?: boolean
	segmentLabels?: { up: string; down: string }
	className?: string
	ariaLabel?: string
}

function summaryLines(
	series: BarChartSeries,
	segmentLabels: { up: string; down: string },
): string {
	const parts = series.values.map(
		(v) =>
			`${v.x}: ${formatSvgNumber(clampNonNegative(v.up))} ${segmentLabels.up}, ${formatSvgNumber(clampNonNegative(v.down))} ${segmentLabels.down}`,
	)
	return `${series.label}. ${parts.join('; ')}`
}

function isBarEmpty(series: BarChartSeries): boolean {
	return series.values.every((v) => clampNonNegative(v.up) + clampNonNegative(v.down) === 0)
}

function legendSwatchClass(theme: SaasTheme, chartIndex: 1 | 2 | 3 | 4 | 5 | 6): string {
	return theme === 'ops' ? `bg-ops-chart-${chartIndex}` : `bg-account-chart-${chartIndex}`
}

/** Stacked vertical bars — pure SVG (FE.17.7 / FE.18.13). */
export function BarChart({
	theme = 'ops',
	series,
	width,
	height,
	legend = true,
	segmentLabels,
	className,
	ariaLabel,
}: BarChartProps) {
	const upLabel = segmentLabels?.up ?? opsChartsCopy.barSegmentUp
	const downLabel = segmentLabels?.down ?? opsChartsCopy.barSegmentDown

	if (series.values.length === 0 || isBarEmpty(series)) {
		return <ChartEmpty theme={theme} className={className} />
	}

	const pad = 8
	const chartBottom = height - pad - 14
	const chartTop = pad + (legend ? 20 : 4)
	const chartH = Math.max(8, chartBottom - chartTop)
	const n = series.values.length
	const gap = 6
	const barSlot = (width - 2 * pad - gap * (n - 1)) / Math.max(1, n)

	let maxStack = 0
	for (const v of series.values) {
		const u = clampNonNegative(v.up)
		const d = clampNonNegative(v.down)
		maxStack = Math.max(maxStack, u + d)
	}
	if (maxStack <= 0) {
		return <ChartEmpty theme={theme} className={className} />
	}

	const aria = ariaLabel ?? summaryLines(series, { up: upLabel, down: downLabel })
	const upChart = CHART_TONE_INDEX.success
	const downChart = CHART_TONE_INDEX.danger

	const bars: ReactNode[] = []
	for (let i = 0; i < n; i++) {
		const v = series.values[i]
		const u = clampNonNegative(v.up)
		const d = clampNonNegative(v.down)
		const stack = u + d
		const totalH = (stack / maxStack) * chartH
		const upH = stack > 0 ? (u / stack) * totalH : 0
		const downH = stack > 0 ? (d / stack) * totalH : 0
		const x = pad + i * (barSlot + gap)
		const xMid = x + barSlot / 2

		const downY = chartBottom - downH
		const upY = downY - upH

		if (downH > 0) {
			bars.push(
				<rect
					key={`d-${i}`}
					x={x}
					y={downY}
					width={barSlot}
					height={downH}
					fill={saasChartHslVar(theme, downChart)}
				/>,
			)
		}
		if (upH > 0) {
			bars.push(
				<rect
					key={`u-${i}`}
					x={x}
					y={upY}
					width={barSlot}
					height={upH}
					fill={saasChartHslVar(theme, upChart)}
				/>,
			)
		}

		bars.push(
			<text
				key={`lbl-${i}`}
				x={xMid}
				y={height - 2}
				fill={
					theme === 'ops'
						? 'hsl(var(--ops-muted))'
						: 'hsl(var(--account-muted))'
				}
				style={{ fontSize: 9 }}
				textAnchor="middle"
			>
				{v.x}
			</text>,
		)
	}

	const fg =
		theme === 'ops' ? 'text-ops-foreground' : 'text-account-foreground'

	return (
		<figure className={cn('min-w-0', className)}>
			<svg
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				role="img"
				aria-label={aria}
			>
				<title>{aria}</title>
				{bars}
			</svg>
			{legend ? (
				<div className={cn('mt-1 flex flex-wrap gap-3 text-[11px]', fg)}>
					<span className="inline-flex items-center gap-1.5">
						<span
							className={cn('inline-block size-2 rounded-sm', legendSwatchClass(theme, upChart))}
							aria-hidden
						/>
						{upLabel}
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span
							className={cn('inline-block size-2 rounded-sm', legendSwatchClass(theme, downChart))}
							aria-hidden
						/>
						{downLabel}
					</span>
				</div>
			) : null}
		</figure>
	)
}
