/** @vitest-environment happy-dom */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AccountSidebar } from '@/features/account/components/AccountSidebar'
import { accountSidebarCopy } from '@/features/account/copy/account-sidebar-copy'

vi.mock('next/navigation', () => ({
	usePathname: vi.fn(() => '/account'),
	useSearchParams: vi.fn(() => new URLSearchParams()),
}))

describe('AccountSidebar (FE.18.2)', () => {
	it('renders grouped Activity labels and core links for a booker', () => {
		render(
			<AccountSidebar
				role="booker"
				collapsed={false}
				onToggleCollapsed={() => {}}
				mobileOpen={false}
				onCloseMobile={() => {}}
			/>,
		)

		const nav = screen.getByRole('navigation', { name: accountSidebarCopy.navAriaLabel })
		expect(within(nav).getByText(accountSidebarCopy.groupActivity)).toBeTruthy()
		expect(within(nav).queryByText(accountSidebarCopy.groupBilling)).toBeNull()
		expect(within(nav).getByRole('link', { name: accountSidebarCopy.itemDashboard }).getAttribute('href')).toBe(
			'/account',
		)
		expect(screen.queryByRole('link', { name: accountSidebarCopy.itemInvoices })).toBeNull()
	})

	it('shows admin-only links for admins', () => {
		render(
			<AccountSidebar
				role="admin"
				collapsed={false}
				onToggleCollapsed={() => {}}
				mobileOpen={false}
				onCloseMobile={() => {}}
			/>,
		)
		expect(screen.getByRole('link', { name: accountSidebarCopy.itemInvoices }).getAttribute('href')).toBe(
			'/account/billing/invoices',
		)
		expect(screen.getByRole('link', { name: accountSidebarCopy.itemQuotes }).getAttribute('href')).toBe(
			'/account/billing/quotes',
		)
		expect(screen.getByRole('link', { name: accountSidebarCopy.itemMembers }).getAttribute('href')).toBe(
			'/account/members',
		)
	})
})
