import { describe, expect, it } from 'vitest'

import { buildPaginationWindowItems } from '@/features/ops/lib/ops-pagination-window'

describe('buildPaginationWindowItems', () => {
	it('returns empty when totalPages < 1', () => {
		expect(buildPaginationWindowItems(0, 1)).toEqual([])
	})

	it('shows all pages without ellipsis when totalPages ≤ 7', () => {
		expect(buildPaginationWindowItems(1, 1)).toEqual([1])
		expect(buildPaginationWindowItems(7, 4)).toEqual([1, 2, 3, 4, 5, 6, 7])
	})

	it('truncates with ellipsis when totalPages > 7', () => {
		expect(buildPaginationWindowItems(8, 4)).toEqual([1, 2, 3, 4, 5, 6, 'ellipsis', 8])
		expect(buildPaginationWindowItems(15, 1)).toEqual([1, 2, 3, 'ellipsis', 15])
		expect(buildPaginationWindowItems(15, 8)).toEqual([
			1,
			'ellipsis',
			6,
			7,
			8,
			9,
			10,
			'ellipsis',
			15,
		])
	})

	it('clamps current into range for window', () => {
		expect(buildPaginationWindowItems(50, 25)).toContain(1)
		expect(buildPaginationWindowItems(50, 25)).toContain(50)
	})
})
