import { describe, expect, it } from 'vitest'

import { OPS_LAYOUT_WIDTHS_REM } from '@/features/ops/ops-layout-tokens'

describe('OPS_LAYOUT_WIDTHS_REM', () => {
	it('matches Story 5.1 shell widths (14rem / 4.5rem)', () => {
		expect(OPS_LAYOUT_WIDTHS_REM.sidebarExpanded).toBe(14)
		expect(OPS_LAYOUT_WIDTHS_REM.sidebarCollapsed).toBe(4.5)
	})
})
