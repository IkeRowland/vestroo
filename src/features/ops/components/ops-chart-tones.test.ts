import { describe, expect, it } from 'vitest'

import {
	OPS_CHART_TONE_INDEX,
	type OpsChartTone,
} from '@/features/ops/components/ops-chart-tones'

describe('ops-chart-tones (FE.17.7)', () => {
	it('maps every OpsChartTone to chart index 1..6', () => {
		const tones: OpsChartTone[] = ['accent', 'success', 'warning', 'danger', 'muted']
		for (const t of tones) {
			const n = OPS_CHART_TONE_INDEX[t]
			expect(n).toBeGreaterThanOrEqual(1)
			expect(n).toBeLessThanOrEqual(6)
		}
	})

	it('keeps a stable default mapping for regression / docs', () => {
		expect(OPS_CHART_TONE_INDEX).toEqual({
			accent: 1,
			success: 5,
			warning: 6,
			danger: 2,
			muted: 4,
		})
	})
})
