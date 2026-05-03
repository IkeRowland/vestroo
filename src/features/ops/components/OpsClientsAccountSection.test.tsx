/** @vitest-environment happy-dom */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

expect.extend(toHaveNoViolations)

import { OpsClientsAccountSection } from '@/features/ops/components/OpsClientsAccountSection'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: mockPush,
	}),
}))

const baseAccount = {
	id: 'a1111111-1111-4111-8111-111111111111',
	name: 'Acme Transport',
	slug: 'acme-transport',
	status: 'active',
	credit_terms_days: 30,
	credit_limit_zar: null as number | null,
	authorized_email_domains: ['acme.example'],
	created_at: '2026-01-01T00:00:00.000Z',
	contract_starts_on: null as string | null,
	contract_ends_on: null as string | null,
}

describe('OpsClientsAccountSection (Story 17.11)', () => {
	beforeEach(() => {
		mockPush.mockClear()
		vi.stubGlobal(
			'matchMedia',
			vi.fn().mockImplementation((query: string) => ({
				matches: typeof query === 'string' && query.includes('1024'),
				media: String(query),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('toggles select-all and row checkboxes without calling router', () => {
		render(
			<OpsClientsAccountSection
				accounts={[
					baseAccount,
					{
						...baseAccount,
						id: 'b2222222-2222-4222-8222-222222222222',
						name: 'Beta Ltd',
						slug: 'beta-ltd',
					},
				]}
				selectedAccountId={null}
				recentBookings={[]}
			/>,
		)

		const table = screen.getByRole('table', { name: /selectable list with profile rail/i })
		const selectAll = within(table).getByRole('checkbox', { name: /select all/i })
		fireEvent.click(selectAll)
		expect(screen.getByRole('status').textContent).toContain('2 selected')

		const rowCheckboxes = within(table).getAllByRole('checkbox', { name: /select account client/i })
		expect(rowCheckboxes).toHaveLength(2)
		expect(rowCheckboxes.every((c) => (c as HTMLInputElement).checked)).toBe(true)

		fireEvent.click(selectAll)
		expect(screen.queryByRole('status')).toBeNull()
		expect(mockPush).not.toHaveBeenCalled()
	})

	it('opens detail via router when a row is activated', () => {
		render(
			<OpsClientsAccountSection
				accounts={[baseAccount]}
				selectedAccountId={null}
				recentBookings={[]}
			/>,
		)

		const row = screen.getByTestId('ops-clients-account-row')
		fireEvent.click(row)
		expect(mockPush).toHaveBeenCalledWith('/ops/clients?id=a1111111-1111-4111-8111-111111111111', {
			scroll: false,
		})
	})

	it('passes axe on a minimal account table + rail', async () => {
		const { container } = render(
			<OpsClientsAccountSection
				accounts={[baseAccount]}
				selectedAccountId={baseAccount.id}
				recentBookings={[
					{
						id: 'c3333333-3333-4333-8333-333333333333',
						payment_reference: 'PAY-1',
						status: 'paid',
						pickup_datetime: null,
						created_at: '2026-02-01T00:00:00.000Z',
					},
				]}
			/>,
		)
		expect(await axe(container)).toHaveNoViolations()
	})
})
