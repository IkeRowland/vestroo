/**
 * Seven-point KPI spark preview — anchored to live counts (Story 17.5 / FE.17.7), not historical DB series.
 * Same posture as **`opsDashboardDemoSparklinePoints`** on **`/ops`**.
 */

export type OpsInvoicingKpiSparkKey = 'completed' | 'awaiting' | 'overdue'

function hashSeed(parts: string[]): number {
	let h = 0
	const s = parts.join('|')
	for (let i = 0; i < s.length; i++) {
		h = Math.imul(31, h) + s.charCodeAt(i)
		h |= 0
	}
	return Math.abs(h)
}

export function opsInvoicingDemoSparklinePoints(
	key: OpsInvoicingKpiSparkKey,
	currentValue: number,
): number[] {
	const n = 7
	const last = Number.isFinite(currentValue) ? Math.max(0, Math.round(currentValue)) : 0
	const seed = hashSeed([key, String(last)])
	const points: number[] = []
	for (let i = 0; i < n; i++) {
		const t = i / (n - 1 || 1)
		const wobble = (((seed >> (i * 5)) & 0xff) / 255 - 0.5) * 0.35
		const base = last === 0 ? (seed % 7) + i : last * (0.42 + 0.58 * t)
		points.push(Math.max(0, Math.round(base * (1 + wobble))))
	}
	points[n - 1] = last
	return points
}
