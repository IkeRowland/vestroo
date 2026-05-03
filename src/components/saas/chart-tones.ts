import type { CSSProperties } from 'react'

import type { SaasTheme } from '@/components/saas/saas-theme'

/**
 * Semantic series tones → chart index 1…6 (shared ops/account palettes).
 */
export type ChartTone = 'accent' | 'success' | 'warning' | 'danger' | 'muted'

export const CHART_TONE_INDEX: Record<ChartTone, 1 | 2 | 3 | 4 | 5 | 6> = {
	accent: 1,
	success: 5,
	warning: 6,
	danger: 2,
	muted: 4,
}

export function saasChartHslVar(theme: SaasTheme, index: 1 | 2 | 3 | 4 | 5 | 6): string {
	const ns = theme === 'ops' ? 'ops' : 'account'
	return `hsl(var(--${ns}-chart-${index}))`
}

export function saasChartToneTextClass(
	theme: SaasTheme,
	tone: ChartTone,
): `text-ops-chart-${1 | 2 | 3 | 4 | 5 | 6}` | `text-account-chart-${1 | 2 | 3 | 4 | 5 | 6}` {
	const n = CHART_TONE_INDEX[tone]
	return theme === 'ops' ? `text-ops-chart-${n}` : `text-account-chart-${n}`
}

export function saasChartToneColorVar(theme: SaasTheme, tone: ChartTone): CSSProperties {
	const n = CHART_TONE_INDEX[tone]
	const ns = theme === 'ops' ? 'ops' : 'account'
	return { color: `hsl(var(--${ns}-chart-${n}))` }
}
