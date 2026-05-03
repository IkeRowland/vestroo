import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
	ACCOUNT_FE_18_1_CSS_VAR_NAMES,
	ACCOUNT_LAYOUT_WIDTHS_REM,
} from '@/features/account/account-layout-tokens'

describe('ACCOUNT_LAYOUT_WIDTHS_REM', () => {
	it('matches account shell widths (14rem / 4.5rem)', () => {
		expect(ACCOUNT_LAYOUT_WIDTHS_REM.sidebarExpanded).toBe(14)
		expect(ACCOUNT_LAYOUT_WIDTHS_REM.sidebarCollapsed).toBe(4.5)
	})
})

describe('ACCOUNT_FE_18_1_CSS_VAR_NAMES (Story 18.1)', () => {
	const globalsCss = readFileSync(
		join(process.cwd(), 'src/app/globals.css'),
		'utf8',
	)

	const lightBlock = globalsCss.match(
		/\[data-account-theme='light'\]\s*\{([^}]+)\}/s,
	)?.[1]

	it('defines every FE.18.1 token under light account theme', () => {
		expect(lightBlock, 'light account block').toBeDefined()
		for (const name of ACCOUNT_FE_18_1_CSS_VAR_NAMES) {
			expect(lightBlock, name).toContain(name)
		}
	})
})
