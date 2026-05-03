/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'

describe('OpsStatusPill (Story 17.7)', () => {
	it('renders visible children text', () => {
		render(
			<OpsStatusPill tone="success">
				Completed
			</OpsStatusPill>,
		)
		expect(screen.getByText('Completed')).toBeTruthy()
	})

	it('shows decorative dot by default', () => {
		const { container } = render(
			<OpsStatusPill tone="info">
				On trip
			</OpsStatusPill>,
		)
		const dots = container.querySelectorAll('[aria-hidden="true"]')
		expect(dots.length).toBeGreaterThanOrEqual(1)
	})

	it('omits dot when dot={false}', () => {
		const { container } = render(
			<OpsStatusPill tone="warning" dot={false}>
				Awaiting payment
			</OpsStatusPill>,
		)
		expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
		expect(screen.getByText('Awaiting payment')).toBeTruthy()
	})
})
