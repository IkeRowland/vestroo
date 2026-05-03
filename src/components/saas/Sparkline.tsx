import { ChartEmpty } from '@/components/saas/ChartEmpty'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { formatSvgNumber } from '@/components/saas/chart-utils'
import { cn } from '@/lib/utils'

export type SparklineProps = {
	theme?: SaasTheme
	points: number[]
	width: number
	height: number
	/** When unset, uses `currentColor` with accent text class on the root `<svg>`. */
	color?: string
	ariaLabel: string
	className?: string
}

function sparkGeometry(
	points: number[],
	width: number,
	height: number,
): { lineD: string; areaD: string } | null {
	if (points.length === 0) {
		return null
	}
	const pad = 2
	const innerW = Math.max(1, width - 2 * pad)
	const innerH = Math.max(1, height - 2 * pad)
	const vals = points.map((p) => (Number.isFinite(p) ? p : 0))
	const min = Math.min(...vals)
	const max = Math.max(...vals)
	const range = max - min || 1

	const coords = vals.map((p, i) => {
		const t = vals.length === 1 ? 0 : i / (vals.length - 1)
		const x = pad + t * innerW
		const yn = pad + (1 - (p - min) / range) * innerH
		return { x, y: yn }
	})

	const lineD = coords
		.map((c, i) => `${i === 0 ? 'M' : 'L'} ${formatSvgNumber(c.x)} ${formatSvgNumber(c.y)}`)
		.join(' ')

	const last = coords[coords.length - 1]
	const first = coords[0]
	const bottom = height - pad
	const areaD = `${lineD} L ${formatSvgNumber(last.x)} ${formatSvgNumber(bottom)} L ${formatSvgNumber(first.x)} ${formatSvgNumber(bottom)} Z`

	return { lineD, areaD }
}

/** Inline KPI sparkline — pure SVG (FE.17.7 / FE.18.13). */
export function Sparkline({
	theme = 'ops',
	points,
	width,
	height,
	color,
	ariaLabel,
	className,
}: SparklineProps) {
	if (points.length === 0) {
		return <ChartEmpty theme={theme} className={className} />
	}

	const geom = sparkGeometry(points, width, height)
	if (!geom) {
		return <ChartEmpty theme={theme} className={className} />
	}

	const strokeStyle = color ? ({ color } as const) : undefined
	const accentClass =
		theme === 'ops' ? 'text-ops-accent' : 'text-account-accent'

	return (
		<svg
			className={cn(!color && accentClass, className)}
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			role="img"
			aria-label={ariaLabel}
			style={strokeStyle}
		>
			<path d={geom.areaD} fill="currentColor" fillOpacity={0.18} stroke="none" />
			<path
				d={geom.lineD}
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}
