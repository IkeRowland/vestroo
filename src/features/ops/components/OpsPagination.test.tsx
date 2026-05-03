/** @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const push = vi.fn()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push }),
}))

import { OpsPagination } from '@/features/ops/components/OpsPagination'
import { opsPaginationCopy } from '@/features/ops/copy/ops-pagination-copy'

describe('OpsPagination (Story 17.8)', () => {
	it('renders range line with en dash and status', () => {
		render(
			<OpsPagination
				pathname="/ops/bookings"
				query="status=paid"
				currentPage={2}
				totalPages={10}
				totalCount={95}
				perPage={10}
			/>,
		)
		const line = screen.getByRole('status')
		expect(line.textContent).toContain('Showing')
		expect(line.textContent).toContain('of 95')
		/* U+2013 en dash */
		expect(line.textContent).toMatch(/\u2013/)
	})

	it('disables Prev on first page and Next on last page', () => {
		const { container: a } = render(
			<OpsPagination
				pathname="/ops/t"
				currentPage={1}
				totalPages={3}
				totalCount={30}
				perPage={10}
			/>,
		)
		expect(
			a.querySelector('[aria-disabled="true"][aria-label="Previous page"]'),
		).toBeTruthy()

		const { container: b } = render(
			<OpsPagination
				pathname="/ops/t"
				currentPage={3}
				totalPages={3}
				totalCount={25}
				perPage={10}
			/>,
		)
		expect(
			b.querySelector('[aria-disabled="true"][aria-label="Next page"]'),
		).toBeTruthy()
	})

	it('marks active page with aria-current', () => {
		const { container } = render(
			<OpsPagination
				pathname="/ops/t"
				currentPage={4}
				totalPages={12}
				totalCount={120}
				perPage={10}
			/>,
		)
		const current = container.querySelector('[aria-current="page"]')
		expect(current?.textContent?.trim()).toBe('4')
	})

	it('changing per navigates to page 1 with new per', () => {
		push.mockClear()
		render(
			<OpsPagination
				pathname="/ops/bookings"
				query="x=1"
				currentPage={3}
				totalPages={5}
				totalCount={50}
				perPage={10}
			/>,
		)
		const select = screen.getByRole('combobox', {
			name: opsPaginationCopy.resultsPerPageLabel,
		})
		fireEvent.change(select, { target: { value: '50' } })
		expect(push).toHaveBeenCalledWith('/ops/bookings?x=1&per=50')
	})

	it('hides pager controls when totalPages is 0', () => {
		render(
			<OpsPagination
				pathname="/ops/t"
				currentPage={1}
				totalPages={0}
				totalCount={0}
				perPage={20}
			/>,
		)
		expect(screen.getByText(opsPaginationCopy.showingNone)).toBeTruthy()
		expect(screen.queryByRole('combobox')).toBeNull()
	})
})
