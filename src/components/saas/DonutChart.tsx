import type { ReactNode } from 'react'

import { ChartEmpty } from '@/components/saas/ChartEmpty'
import type { ChartTone } from '@/components/saas/chart-tones'
import { CHART_TONE_INDEX, saasChartHslVar } from '@/components/saas/chart-tones'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { donutSlicePath, formatSvgNumber } from '@/components/saas/chart-utils'
import { cn } from '@/lib/utils'

export type DonutSlice = {
	label: string
	value: number
	tone: ChartTone
}

export type DonutChartProps = {
	theme?: SaasTheme
	slices: DonutSlice[]
	width?: number
	height?: number
	children?: ReactNode
	className?: string
	ariaLabel?: string
}

function slicesTotal(slices: DonutSlice[]): number {
	return slices.reduce((acc, s) => acc + Math.max(0, Number.isFinite(s.value) ? s.value : 0), 0)
}

function donutSummary(slices: DonutSlice[], total: number): string {
	if (total <= 0) {
		return ''
	}
	return slices
		.map((s) => {
			const v = Math.max(0, Number.isFinite(s.value) ? s.value : 0)
			const pct = Math.round((v / total) * 1000) / 10
			return `${s.label} ${formatSvgNumber(pct)} percent`
		})
		.join(', ')
}

/** Donut chart with tone-mapped slices — pure SVG (FE.18.13). */
export function DonutChart({
	theme = 'ops',
	slices,
	width = 200,
	height = 200,
	children,
	className,
	ariaLabel,
}: DonutChartProps) {
	const total = slicesTotal(slices)
	if (slices.length === 0 || total <= 0) {
		return <ChartEmpty theme={theme} className={className} />
	}

	const cx = width / 2
	const cy = height / 2
	const outerR = Math.min(width, height) * 0.38
	const innerR = outerR * 0.58

	const paths: ReactNode[] = []

	if (slices.length === 1) {
		const s = slices[0]
		const n = CHART_TONE_INDEX[s.tone]
		const fill = saasChartHslVar(theme, n)
		const a = donutSlicePath(cx, cy, innerR, outerR, 0, 180)
		const b = donutSlicePath(cx, cy, innerR, outerR, 180, 360)
		paths.push(<path key="full-a" d={a} fill={fill} />)
		paths.push(<path key="full-b" d={b} fill={fill} />)
	} else {
		let angle = 0
		const tau = 360
		for (let i = 0; i < slices.length; i++) {
			const s = slices[i]
			const raw = Math.max(0, Number.isFinite(s.value) ? s.value : 0)
			const sweep = (raw / total) * tau
			const start = angle
			const end = angle + sweep
			const n = CHART_TONE_INDEX[s.tone]
			const d = donutSlicePath(cx, cy, innerR, outerR, start, end)
			paths.push(
				<path key={`${s.label}-${i}`} d={d} fill={saasChartHslVar(theme, n)} />,
			)
			angle = end
		}
	}

	const summary = donutSummary(slices, total)
	const aria = ariaLabel ?? `Distribution: ${summary}`
	const centerFg =
		theme === 'ops' ? 'text-ops-foreground' : 'text-account-foreground'

	return (
		<figure className={cn('inline-flex flex-col items-center gap-2', className)}>
			<div className="relative" style={{ width, height }}>
				<svg
					className="block"
					width={width}
					height={height}
					viewBox={`0 0 ${width} ${height}`}
					role="img"
					aria-label={aria}
				>
					{paths}
				</svg>
				{children ? (
					<div
						className={cn(
							'pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-sm',
							centerFg,
						)}
						aria-hidden
					>
						{children}
					</div>
				) : null}
			</div>
			<ul className="sr-only">
				{slices.map((s) => (
					<li key={s.label}>
						{s.label}: {formatSvgNumber(Math.max(0, s.value))} of {formatSvgNumber(total)}
					</li>
				))}
			</ul>
		</figure>
	)
}
