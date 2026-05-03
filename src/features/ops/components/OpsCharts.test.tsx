/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import { expect } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

import { opsChartsCopy } from '@/features/ops/copy/ops-charts-copy'
import { OpsAreaChart } from '@/features/ops/components/OpsAreaChart'
import { OpsBarChart } from '@/features/ops/components/OpsBarChart'
import { OpsDonutChart } from '@/features/ops/components/OpsDonutChart'
import { OpsSparkline } from '@/features/ops/components/OpsSparkline'

expect.extend(toHaveNoViolations)

describe('Ops chart primitives (Story 17.5 / FE.17.7)', () => {
	it('OpsSparkline — deterministic snapshot + empty state + axe', async () => {
		const { container, unmount } = render(
			<OpsSparkline
				points={[1, 3, 2, 5]}
				width={100}
				height={32}
				ariaLabel="Test sparkline"
			/>,
		)
		expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 100 32')
		expect(await axe(container)).toHaveNoViolations()
		unmount()

		render(<OpsSparkline points={[]} width={100} height={32} ariaLabel="empty" />)
		expect(screen.getByRole('status').textContent).toBe(opsChartsCopy.noDataForPeriod)
	})

	it('OpsAreaChart — empty + snapshot path stability', () => {
		const { container, rerender } = render(
			<OpsAreaChart
				points={[]}
				ariaLabel="empty area"
				width={200}
				height={80}
			/>,
		)
		expect(screen.getByRole('status').textContent).toBe(opsChartsCopy.noDataForPeriod)

		rerender(
			<OpsAreaChart
				points={[
					{ x: 'Jan', y: 1 },
					{ x: 'Feb', y: 3 },
					{ x: 'Mar', y: 2 },
				]}
				ariaLabel="Q1 series"
				width={200}
				height={80}
			/>,
		)
		const d = container.querySelector('path[fill="currentColor"]')?.getAttribute('d') ?? ''
		expect(d).toMatchSnapshot('area-fill-path')
	})

	it('OpsBarChart — empty when all stacks zero, and snapshot', () => {
		const { container, rerender } = render(
			<OpsBarChart
				series={{
					label: 'Bookings',
					values: [
						{ x: 'A', up: 0, down: 0 },
						{ x: 'B', up: 0, down: 0 },
					],
				}}
				width={220}
				height={120}
				legend
			/>,
		)
		expect(screen.getByRole('status').textContent).toBe(opsChartsCopy.noDataForPeriod)

		rerender(
			<OpsBarChart
				series={{
					label: 'Bookings',
					values: [
						{ x: 'A', up: 4, down: 1 },
						{ x: 'B', up: 2, down: 2 },
					],
				}}
				width={220}
				height={120}
				legend
			/>,
		)
		const rects = container.querySelectorAll('rect')
		expect(rects.length).toBe(4)
	})

	it('OpsBarChart — axe on rendered chart', async () => {
		const { container } = render(
			<OpsBarChart
				series={{
					label: 'T',
					values: [{ x: 'M', up: 2, down: 1 }],
				}}
				width={180}
				height={100}
			/>,
		)
		expect(await axe(container)).toHaveNoViolations()
	})

	it('OpsDonutChart — empty + single-slice ring + axe', async () => {
		const { container, rerender } = render(
			<OpsDonutChart
				slices={[]}
			/>,
		)
		expect(screen.getByRole('status').textContent).toBe(opsChartsCopy.noDataForPeriod)

		rerender(
			<OpsDonutChart
				slices={[{ label: 'A', value: 10, tone: 'success' }]}
				ariaLabel="One segment"
			>
				<span>100%</span>
			</OpsDonutChart>,
		)
		expect(container.querySelectorAll('path').length).toBe(2)
		expect(await axe(container)).toHaveNoViolations()
	})
})
