/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { OpsSidebar } from '@/features/ops/components/OpsSidebar'

vi.mock('next/navigation', () => ({
	usePathname: () => '/ops/fleet/drivers',
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
	it('renders Fulfilment links including Clients and Fleet', () => {
		render(<OpsSidebar {...base} />)
		expect(screen.getByText('Fulfilment')).toBeTruthy()
		const clients = screen.getByRole('link', { name: 'Clients' })
		expect(clients.getAttribute('href')).toBe('/ops/clients')
		const fleet = screen.getByRole('link', { name: 'Fleet' })
		expect(fleet.getAttribute('href')).toBe('/ops/fleet/drivers')
	})

	it('shows a count badge when navBadgeCounts supplies a positive number', () => {
		render(<OpsSidebar {...base} navBadgeCounts={{ '/ops/fleet/drivers': 3 }} />)
		expect(screen.getByText('3')).toBeTruthy()
	})

	it('does not render a badge for zero counts', () => {
		render(<OpsSidebar {...base} navBadgeCounts={{ '/ops/fleet/drivers': 0 }} />)
		expect(screen.queryByText('0')).toBeNull()
	})

	it('adds md:hidden to badges when the sidebar rail is collapsed', () => {
		render(<OpsSidebar {...base} collapsed navBadgeCounts={{ '/ops/fleet/drivers': 2 }} />)
		const badge = screen.getByText('2')
		expect(badge.className).toMatch(/md:hidden/)
	})
})
