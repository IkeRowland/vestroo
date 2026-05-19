import type { CSSProperties } from 'react'

import type { ChartTone } from '@/components/saas/chart-tones'
import {
	CHART_TONE_INDEX,
	saasChartToneColorVar,
	saasChartToneTextClass,
} from '@/components/saas/chart-tones'

/**
 * Semantic series tones → **`--ops-chart-1`…`--ops-chart-6`** (**thin alias** over shared **`chart-tones`**).
 * @see `docs/ops-design-system-parity.md` §17.5
 */
export type OpsChartTone = ChartTone

export const OPS_CHART_TONE_INDEX = CHART_TONE_INDEX

export function opsChartToneTextClass(tone: OpsChartTone): `text-ops-chart-${1 | 2 | 3 | 4 | 5 | 6}` {
	return saasChartToneTextClass('ops', tone) as `text-ops-chart-${1 | 2 | 3 | 4 | 5 | 6}`
}

/** For `currentColor` / `fill` on SVG when Tailwind class is awkward. */
export function opsChartToneColorVar(tone: OpsChartTone): CSSProperties {
	return saasChartToneColorVar('ops', tone)
}
