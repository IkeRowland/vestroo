import { ChartEmpty } from '@/components/saas/ChartEmpty'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { formatSvgNumber } from '@/components/saas/chart-utils'
import { cn } from '@/lib/utils'

export type AreaChartPoint = { x: string; y: number }

export type AreaChartProps = {
	theme?: SaasTheme
	points: AreaChartPoint[]
	ariaLabel: string
	width: number
	height: number
	className?: string
}

function areaPaths(points: AreaChartPoint[], width: number, height: number): string | null {
	if (points.length === 0) {
		return null
	}
	const padX = 4
	const padY = 8
	const innerW = Math.max(1, width - 2 * padX)
	const innerH = Math.max(1, height - 2 * padY)
	const ys = points.map((p) => (Number.isFinite(p.y) ? p.y : 0))
	const min = Math.min(...ys)
	const max = Math.max(...ys)
	const range = max - min || 1

	const coords = ys.map((y, i) => {
		const t = ys.length === 1 ? 0 : i / (ys.length - 1)
		const px = padX + t * innerW
		const py = padY + (1 - (y - min) / range) * innerH
		return { px, py }
	})

	const lineD = coords
		.map((c, i) => `${i === 0 ? 'M' : 'L'} ${formatSvgNumber(c.px)} ${formatSvgNumber(c.py)}`)
		.join(' ')

	const last = coords[coords.length - 1]
	const first = coords[0]
	const bottom = height - padY
	const areaD = `${lineD} L ${formatSvgNumber(last.px)} ${formatSvgNumber(bottom)} L ${formatSvgNumber(first.px)} ${formatSvgNumber(bottom)} Z`

	return `${areaD}|${lineD}`
}

/** Area + line chart — pure SVG (FE.18.13). */
export function AreaChart({
	theme = 'ops',
	points,
	ariaLabel,
	width,
	height,
	className,
}: AreaChartProps) {
	if (points.length === 0) {
		return <ChartEmpty theme={theme} className={className} />
	}

	const packed = areaPaths(points, width, height)
	if (!packed) {
		return <ChartEmpty theme={theme} className={className} />
	}
	const [areaD, lineD] = packed.split('|')

	const accentClass =
		theme === 'ops' ? 'text-ops-accent' : 'text-account-accent'

	return (
		<svg
			className={cn(accentClass, className)}
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			role="img"
			aria-label={ariaLabel}
		>
			<path d={areaD} fill="currentColor" fillOpacity={0.15} stroke="none" />
			<path
				d={lineD}
				fill="none"
				stroke="currentColor"
				strokeWidth={1.75}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}
