/**
 * Deterministic math for SaaS SVG charts (locale-safe, snapshot-stable).
 * @see src/features/ops/components/OpsCharts.test.tsx
 */

/** Round for stable path `d` strings (Task 0 / AC12). */
export function formatSvgNumber(n: number): string {
	if (!Number.isFinite(n)) {
		return '0'
	}
	const r = Math.round(n * 1000) / 1000
	return Object.is(r, -0) ? '0' : String(r)
}

export function clampNonNegative(n: number): number {
	if (!Number.isFinite(n) || n < 0) {
		return 0
	}
	return n
}

export function donutSlicePath(
	cx: number,
	cy: number,
	innerR: number,
	outerR: number,
	startAngleDeg: number,
	endAngleDeg: number,
): string {
	const toRad = (d: number) => ((d - 90) * Math.PI) / 180
	const startRad = toRad(startAngleDeg)
	const endRad = toRad(endAngleDeg)
	const xo1 = cx + outerR * Math.cos(startRad)
	const yo1 = cy + outerR * Math.sin(startRad)
	const xo2 = cx + outerR * Math.cos(endRad)
	const yo2 = cy + outerR * Math.sin(endRad)
	const xi1 = cx + innerR * Math.cos(endRad)
	const yi1 = cy + innerR * Math.sin(endRad)
	const xi2 = cx + innerR * Math.cos(startRad)
	const yi2 = cy + innerR * Math.sin(startRad)
	const sweep = endAngleDeg - startAngleDeg
	const largeArc = sweep > 180 ? 1 : 0
	return [
		`M ${formatSvgNumber(xo1)} ${formatSvgNumber(yo1)}`,
		`A ${formatSvgNumber(outerR)} ${formatSvgNumber(outerR)} 0 ${largeArc} 1 ${formatSvgNumber(xo2)} ${formatSvgNumber(yo2)}`,
		`L ${formatSvgNumber(xi1)} ${formatSvgNumber(yi1)}`,
		`A ${formatSvgNumber(innerR)} ${formatSvgNumber(innerR)} 0 ${largeArc} 0 ${formatSvgNumber(xi2)} ${formatSvgNumber(yi2)}`,
		'Z',
	].join(' ')
}
