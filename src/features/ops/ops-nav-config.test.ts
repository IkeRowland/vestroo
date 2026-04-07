import { describe, expect, it } from 'vitest'

import { getOpsBreadcrumbs } from '@/features/ops/ops-nav-config'

describe('getOpsBreadcrumbs', () => {
	it('returns operations root and segments for board', () => {
		expect(getOpsBreadcrumbs('/ops/board')).toEqual([
			{ href: '/ops/board', label: 'Operations' },
			{ href: '/ops/board', label: 'Board' },
		])
	})

	it('labels close protection engagement segment', () => {
		expect(
			getOpsBreadcrumbs('/ops/close-protection/eng-123'),
		).toEqual([
			{ href: '/ops/board', label: 'Operations' },
			{ href: '/ops/close-protection', label: 'Close protection' },
			{ href: '/ops/close-protection/eng-123', label: 'Engagement' },
		])
	})

	it('returns empty for non-ops paths', () => {
		expect(getOpsBreadcrumbs('/book/search')).toEqual([])
	})
})
