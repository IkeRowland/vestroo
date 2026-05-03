/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, vi } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

vi.mock('@/features/ops/components/OpsDataFreshnessBar', () => ({
	OpsDataFreshnessBar: () => <div data-testid="ops-data-freshness-bar-mock" />,
}))

vi.mock('@/features/ops/components/OpsFetchErrorIsland', () => ({
	OpsFetchErrorIsland: ({
		title,
		message,
		correlationId,
	}: {
		title: string
		message: string
		correlationId?: string
	}) => (
		<div data-testid="ops-fetch-error-island-mock">
			<p>{title}</p>
			<p>{message}</p>
			{correlationId ? <p>{correlationId}</p> : null}
		</div>
	),
}))

import { OpsDashboardView } from '@/features/ops/components/OpsDashboardView'
import { opsDashboardCopy } from '@/features/ops/copy/ops-dashboard-copy'
import { loadOpsDashboardKpis } from '@/lib/load-ops-dashboard-kpis'
import {
	OPS_DASHBOARD_KPI_ORDER,
	OPS_DASHBOARD_KPI_DEFINITIONS,
	opsDashboardKpiDrillHref,
} from '@/lib/ops-dashboard-kpis'

expect.extend(toHaveNoViolations)

vi.mock('@/lib/load-ops-dashboard-kpis', () => ({
	loadOpsDashboardKpis: vi.fn(),
}))

describe('OpsDashboardView (Story 17.6)', () => {
	beforeEach(() => {
		vi.mocked(loadOpsDashboardKpis).mockResolvedValue({
			ok: true,
			fetchedAtIso: '2026-04-28T12:00:00.000Z',
			newBookingsNeedsAttentionCount: 1,
			kpis: OPS_DASHBOARD_KPI_ORDER.map((id) => ({
				id,
				value: id === 'trips_open' ? 3 : id === 'trips_completed_7d_utc' ? 12 : 1,
				title: OPS_DASHBOARD_KPI_DEFINITIONS[id].title,
				shortDefinition: OPS_DASHBOARD_KPI_DEFINITIONS[id].shortDefinition,
				drillHref: opsDashboardKpiDrillHref(id),
				drillLabel: OPS_DASHBOARD_KPI_DEFINITIONS[id].drillLabel,
			})),
		})
	})

	it('renders scorecards, chart regions, and passes axe', async () => {
		const ui = await OpsDashboardView()
		const { container } = render(ui)

		expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeTruthy()
		expect(
			screen.getByRole('heading', { name: opsDashboardCopy.overviewSectionHeading }),
		).toBeTruthy()
		expect(screen.getByTestId('ops-dash-right-rail')).toBeTruthy()
		expect(
			screen.getByRole('navigation', { name: opsDashboardCopy.shortcutsLandmarkLabel }),
		).toBeTruthy()
		expect(screen.getByRole('heading', { name: /^analytics$/i })).toBeTruthy()
		expect(screen.getByTestId('ops-home-new-bookings-card')).toBeTruthy()
		expect(screen.getByTestId('ops-kpi-trips_open')).toBeTruthy()

		expect(
			screen.getByRole('img', { name: opsDashboardCopy.revenueChartAria }),
		).toBeTruthy()
		expect(screen.getByRole('img', { name: /trip status mix:/i })).toBeTruthy()

		expect(await axe(container)).toHaveNoViolations()
	}, 15_000)

	it('shows fetch error island when loader fails', async () => {
		vi.mocked(loadOpsDashboardKpis).mockResolvedValue({
			ok: false,
			correlationId: 'test-corr-id',
		})
		const ui = await OpsDashboardView()
		render(ui)

		expect(screen.getByText(/dashboard could not be loaded/i)).toBeTruthy()
		expect(screen.getByText(/test-corr-id/)).toBeTruthy()
	})
})
