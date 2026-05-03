/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Route } from 'lucide-react'

import { OpsKpiCard } from '@/features/ops/components/OpsKpiCard'

describe('OpsKpiCard (FE.17.4)', () => {
	it('renders Link overlay when drillHref is set', () => {
		render(
			<OpsKpiCard
				label="Open trips"
				icon={Route}
				value={12}
				deltaPercent={null}
				deltaPolarity="neutral"
				drillHref="/ops/trips"
			/>,
		)
		const link = screen.getByRole('link', { name: /open trips/i })
		expect(link.getAttribute('href')).toBe('/ops/trips')
	})

	it('renders no link when drillHref is absent', () => {
		render(
			<OpsKpiCard
				label="Test"
				icon={Route}
				value={1}
				deltaPercent={null}
				deltaPolarity="neutral"
			/>,
		)
		expect(screen.queryByRole('link')).toBeNull()
	})

	it('applies success tone when upGood and delta positive', () => {
		const { container } = render(
			<OpsKpiCard
				label="Completed trips"
				icon={Route}
				value={9}
				deltaPercent={5}
				deltaPolarity="upGood"
				drillHref="/ops/trips"
			/>,
		)
		expect(container.querySelector('.text-ops-success')).toBeTruthy()
	})

	it('applies danger tone when upBad and delta positive', () => {
		const { container } = render(
			<OpsKpiCard
				label="Pending payment"
				icon={Route}
				value={3}
				deltaPercent={4}
				deltaPolarity="upBad"
				drillHref="/ops/trips?queue=pending"
			/>,
		)
		expect(container.querySelector('.text-ops-danger')).toBeTruthy()
	})

	it('shows loading skeleton for the value row', () => {
		const { container } = render(
			<OpsKpiCard
				label="Test"
				icon={Route}
				value={0}
				loading
				deltaPercent={null}
				deltaPolarity="neutral"
			/>,
		)
		expect(container.querySelector('.animate-pulse')).toBeTruthy()
	})
})
