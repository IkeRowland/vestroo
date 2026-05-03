import { describe, expect, it } from 'vitest'

import { OPS_DASHBOARD_KPI_ORDER, opsDashboardKpiDrillHref } from '@/lib/ops-dashboard-kpis'

describe('ops-dashboard-kpis', () => {
	it('defines a fixed v1 KPI order', () => {
		expect(OPS_DASHBOARD_KPI_ORDER).toHaveLength(6)
		expect(new Set(OPS_DASHBOARD_KPI_ORDER).size).toBe(6)
	})

	it('routes booking KPIs to trips assignment queues', () => {
		expect(opsDashboardKpiDrillHref('bookings_pending_payment')).toBe(
			'/ops/trips?queue=pending',
		)
		expect(opsDashboardKpiDrillHref('bookings_trip_request')).toBe(
			'/ops/trips?queue=trip_request',
		)
	})

	it('routes trip KPIs to trips', () => {
		expect(opsDashboardKpiDrillHref('trips_open')).toBe('/ops/trips')
		expect(opsDashboardKpiDrillHref('trips_booking')).toBe('/ops/trips')
		expect(opsDashboardKpiDrillHref('trips_en_route')).toBe('/ops/trips')
		expect(opsDashboardKpiDrillHref('trips_completed_7d_utc')).toBe('/ops/trips')
	})
})
