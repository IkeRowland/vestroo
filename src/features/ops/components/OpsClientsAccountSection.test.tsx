/** @vitest-environment happy-dom */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OpsClientsAccountSection } from '@/features/ops/components/OpsClientsAccountSection'

expect.extend(toHaveNoViolations)

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

const secondAccount = {
	...baseAccount,
	id: 'b2222222-2222-4222-8222-222222222222',
	name: 'Beta Ltd',
	slug: 'beta-ltd',
}

describe('OpsClientsAccountSection', () => {
	beforeEach(() => {
		mockPush.mockClear()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('toggles select-all and row checkboxes without calling router', () => {
		render(<OpsClientsAccountSection accounts={[baseAccount, secondAccount]} />)

		const table = screen.getByRole('table', { name: /account clients/i })
		const selectAll = within(table).getByRole('checkbox', { name: /select all/i })
		fireEvent.click(selectAll)
		expect(screen.getByRole('status').textContent).toContain('2 selected')

		const rowCheckboxes = within(table).getAllByRole('checkbox', {
			name: /select account client/i,
		})
		expect(rowCheckboxes).toHaveLength(2)
		expect(rowCheckboxes.every((c) => (c as HTMLInputElement).checked)).toBe(true)

		fireEvent.click(selectAll)
		expect(screen.queryByRole('status')).toBeNull()
		expect(mockPush).not.toHaveBeenCalled()
	})

	it('opens detail via router when a row is activated', () => {
		render(<OpsClientsAccountSection accounts={[baseAccount]} />)

		const row = screen.getByTestId('ops-clients-account-row')
		fireEvent.click(row)
		expect(mockPush).toHaveBeenCalledWith(
			'/ops/clients/accounts/a1111111-1111-4111-8111-111111111111',
		)
	})

	it('passes axe on a minimal account table', async () => {
		const { container } = render(<OpsClientsAccountSection accounts={[baseAccount]} />)
		expect(await axe(container)).toHaveNoViolations()
	})
})
