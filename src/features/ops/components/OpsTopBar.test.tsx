/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { OpsTopBar } from '@/features/ops/components/OpsTopBar'
import type { StaffSession } from '@/lib/ops-auth'

vi.mock('next/navigation', () => ({
	usePathname: () => '/ops/bookings',
	useRouter: () => ({
		push: vi.fn(),
		refresh: vi.fn(),
	}),
}))

vi.mock('@/actions/opsTopBarSearch', () => ({
	getOpsTopBarSearchSuggestionsAction: vi.fn(async () => ({
		ok: true as const,
		recentQueries: [],
		quickJump: [],
	})),
	recordOpsTopBarSearchQueryAction: vi.fn(async () => ({ ok: true })),
}))

vi.mock('@/features/ops/components/OpsNotificationsBell', () => ({
	OpsNotificationsBell: () => <div data-testid="ops-notifications-mock" />,
}))

const staff: StaffSession = {
	userId: '00000000-0000-4000-8000-000000000001',
	role: 'dispatcher',
	email: 'ops@test.dev',
	displayName: 'Test User',
}

describe('OpsTopBar (FE.17.2)', () => {
	it('renders inline search with epic placeholder', () => {
		render(<OpsTopBar staff={staff} onOpenMobileNav={() => {}} />)
		const input = screen.getByPlaceholderText('Search bookings, clients, vehicles…')
		expect(input).toBeTruthy()
		expect(input.getAttribute('type')).toBe('search')
	})

	it('exposes settings link to /ops/settings', () => {
		render(<OpsTopBar staff={staff} onOpenMobileNav={() => {}} />)
		const settings = screen.getByRole('link', { name: /settings/i })
		expect(settings.getAttribute('href')).toBe('/ops/settings')
	})
})
