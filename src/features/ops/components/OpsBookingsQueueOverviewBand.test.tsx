/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

import { OpsBookingsQueueOverviewBand } from '@/features/ops/components/OpsBookingsQueueOverviewBand'
import { opsBookingsQueueCopy } from '@/features/ops/copy/ops-bookings-queue-copy'

expect.extend(toHaveNoViolations)

const sampleBar = {
	label: 'Bookings completed vs cancelled by day',
	values: [
		{ x: 'Mon', up: 2, down: 0 },
		{ x: 'Tue', up: 1, down: 1 },
	],
} as const

function wrapOpsTheme(node: ReactNode) {
	return <div data-ops-theme="light">{node}</div>
}

describe('OpsBookingsQueueOverviewBand (Story 17.21)', () => {
	it('renders KPI row, chart, and passes axe', async () => {
		const { container } = render(
			wrapOpsTheme(
				<OpsBookingsQueueOverviewBand
					totalInView={42}
					readyToAssign={3}
					readyToAssignUnavailable={false}
					completed7d={10}
					completed7dUnavailable={false}
					barSeries={sampleBar}
					readyToAssignDrillHref="/ops/bookings?status=ready_to_assign"
				/>,
			),
		)

		expect(
			screen.getByRole('heading', { name: opsBookingsQueueCopy.overviewSectionHeading }),
		).toBeTruthy()
		expect(screen.getByTestId('ops-bq-kpi-in-view')).toBeTruthy()
		expect(screen.getByRole('img', { name: /completed vs cancelled/i })).toBeTruthy()

		expect(await axe(container)).toHaveNoViolations()
	})
})
