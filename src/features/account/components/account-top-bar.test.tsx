/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AccountTopBar } from '@/features/account/components/AccountTopBar'
import { accountTopBarCopy } from '@/features/account/copy/account-top-bar-copy'
import type { AccountPortalMemberSession } from '@/lib/account-portal-auth-shared'

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
		refresh: vi.fn(),
	}),
}))

const baseSession: AccountPortalMemberSession = {
	userId: '00000000-0000-0000-0000-000000000001',
	email: 'member@example.com',
	memberships: [
		{
			accountId: '00000000-0000-0000-0000-0000000000aa',
			role: 'booker',
			account: {
				id: '00000000-0000-0000-0000-0000000000aa',
				name: 'Demo Org',
				slug: 'demo',
			},
		},
	],
	activeAccountId: '00000000-0000-0000-0000-0000000000aa',
	activeAccount: {
		id: '00000000-0000-0000-0000-0000000000aa',
		name: 'Demo Org',
		slug: 'demo',
	},
}

describe('AccountTopBar (FE.18.2)', () => {
	it('renders search placeholder copy exactly', () => {
		render(
			<AccountTopBar
				session={baseSession}
				roleLabel="Booker"
				notificationCount={0}
				onOpenMobileNav={() => {}}
			/>,
		)
		expect(screen.getByPlaceholderText(accountTopBarCopy.searchPlaceholder)).toBeTruthy()
	})

	it('exposes profile menu trigger with aria-label', () => {
		render(
			<AccountTopBar
				session={baseSession}
				roleLabel="Booker"
				onOpenMobileNav={() => {}}
			/>,
		)
		expect(screen.getByRole('button', { name: accountTopBarCopy.profileMenuAria })).toBeTruthy()
	})
})
