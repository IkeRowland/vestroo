import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
	OPS_FE_17_1_CSS_VAR_NAMES,
	OPS_LAYOUT_WIDTHS_REM,
} from '@/features/ops/ops-layout-tokens'

describe('OPS_LAYOUT_WIDTHS_REM', () => {
	it('matches Story 5.1 shell widths (14rem / 4.5rem)', () => {
		expect(OPS_LAYOUT_WIDTHS_REM.sidebarExpanded).toBe(14)
		expect(OPS_LAYOUT_WIDTHS_REM.sidebarCollapsed).toBe(4.5)
	})
})

describe('OPS_FE_17_1_CSS_VAR_NAMES (Story 17.1)', () => {
	const globalsCss = readFileSync(
		join(process.cwd(), 'src/app/globals.css'),
		'utf8',
	)

	const lightBlock = globalsCss.match(
		/\[data-ops-theme='light'\]\s*\{([^}]+)\}/s,
	)?.[1]
	const darkBlock = globalsCss.match(
		/\[data-ops-theme='dark'\]\s*\{([^}]+)\}/s,
	)?.[1]

	it('defines every FE.17.1 token under light and dark ops themes', () => {
		expect(lightBlock, 'light ops block').toBeDefined()
		expect(darkBlock, 'dark ops block').toBeDefined()
		for (const name of OPS_FE_17_1_CSS_VAR_NAMES) {
			expect(lightBlock, name).toContain(name)
			expect(darkBlock, name).toContain(name)
		}
	})
})
