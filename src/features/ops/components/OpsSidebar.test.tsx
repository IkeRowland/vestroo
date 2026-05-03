/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { OpsSidebar } from '@/features/ops/components/OpsSidebar'

vi.mock('next/navigation', () => ({
	usePathname: () => '/ops/vehicles',
}))

vi.mock('@/features/ops/components/OpsSidebarPromoSlot', () => ({
	OpsSidebarPromoSlot: () => null,
}))

const base = {
	role: 'dispatcher' as const,
	collapsed: false,
	onToggleCollapsed: () => {},
	mobileOpen: true,
	onCloseMobile: () => {},
}

describe('OpsSidebar (FE.17.3)', () => {
	it('renders Fleet & People group heading', () => {
		render(<OpsSidebar {...base} />)
		expect(screen.getByText('Fleet & People')).toBeTruthy()
	})

	it('shows a count badge when navBadgeCounts supplies a positive number', () => {
		render(<OpsSidebar {...base} navBadgeCounts={{ '/ops/vehicles': 3 }} />)
		expect(screen.getByText('3')).toBeTruthy()
	})

	it('does not render a badge for zero counts', () => {
		render(<OpsSidebar {...base} navBadgeCounts={{ '/ops/vehicles': 0 }} />)
		expect(screen.queryByText('0')).toBeNull()
	})

	it('adds md:hidden to badges when the sidebar rail is collapsed', () => {
		render(<OpsSidebar {...base} collapsed navBadgeCounts={{ '/ops/vehicles': 2 }} />)
		const badge = screen.getByText('2')
		expect(badge.className).toMatch(/md:hidden/)
	})
})
