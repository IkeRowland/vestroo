/**
 * Ops dashboard KPI registry — v1
 *
 * Normative definitions: `docs/ops-dashboard-kpis-v1.md`
 * Keys and drill targets must stay aligned with that document.
 */

import { OPS_TRIPS_PATH } from '@/lib/ops-trips-url'

/** Fixed v1 set — do not add keys without updating the doc and loaders. */
export type OpsDashboardKpiId =
	| 'trips_open'
	| 'trips_booking'
	| 'trips_en_route'
	| 'trips_completed_7d_utc'
	| 'bookings_pending_payment'
	| 'bookings_trip_request'

export const OPS_DASHBOARD_KPI_ORDER: readonly OpsDashboardKpiId[] = [
	'trips_open',
	'trips_booking',
	'trips_en_route',
	'trips_completed_7d_utc',
	'bookings_pending_payment',
	'bookings_trip_request',
] as const

/** FE.17.4 — delta colouring vs direction (see `docs/ops-design-system-parity.md` §17.4). */
export type OpsKpiDeltaPolarity = 'upGood' | 'upBad' | 'neutral'

export type OpsDashboardKpiDefinition = {
	id: OpsDashboardKpiId
	title: string
	shortDefinition: string
	drillLabel: string
}

/**
 * Epic § scorecards vs repo KPI ids (`OpsDashboardKpiId`):
 * “Trips Today / Fleet on-trip” style rows map to trip-status slices here;
 * “Open quote requests” → `bookings_trip_request`; “Awaiting payment” → `bookings_pending_payment`.
 * Labels remain **`OPS_DASHBOARD_KPI_DEFINITIONS`** / **`docs/ops-dashboard-kpis-v1.md`** until a PO-led rename story lands.
 */
export function opsDashboardKpiDeltaPolarity(id: OpsDashboardKpiId): OpsKpiDeltaPolarity {
	switch (id) {
		case 'trips_completed_7d_utc':
		case 'trips_en_route':
			return 'upGood'
		case 'bookings_pending_payment':
			return 'upBad'
		case 'trips_open':
		case 'trips_booking':
		case 'bookings_trip_request':
		default:
			return 'neutral'
	}
}

export const OPS_DASHBOARD_KPI_DEFINITIONS: Record<
	OpsDashboardKpiId,
	Omit<OpsDashboardKpiDefinition, 'id'> & { id: OpsDashboardKpiId }
> = {
	trips_open: {
		id: 'trips_open',
		title: 'Open trips',
		shortDefinition: 'Trips currently being booked, assigned, or under way.',
		drillLabel: 'View trips',
	},
	trips_booking: {
		id: 'trips_booking',
		title: 'Trips — booking',
		shortDefinition: 'Trips waiting to be assigned to a vehicle and driver.',
		drillLabel: 'View trips',
	},
	trips_en_route: {
		id: 'trips_en_route',
		title: 'Trips — en route',
		shortDefinition: 'Trips that are currently in progress.',
		drillLabel: 'View trips',
	},
	trips_completed_7d_utc: {
		id: 'trips_completed_7d_utc',
		title: 'Completed (7 days)',
		shortDefinition: 'Trips completed during the past seven days.',
		drillLabel: 'View trips',
	},
	bookings_pending_payment: {
		id: 'bookings_pending_payment',
		title: 'Pending payment queue',
		shortDefinition: 'Bookings waiting on full payment before fulfilment.',
		drillLabel: 'Open pending payments',
	},
	bookings_trip_request: {
		id: 'bookings_trip_request',
		title: 'Trip requests',
		shortDefinition: 'Bookings that came in as a custom trip request.',
		drillLabel: 'Open trip requests',
	},
}

export function opsDashboardKpiDrillHref(id: OpsDashboardKpiId): string {
	switch (id) {
		case 'bookings_pending_payment':
			return `${OPS_TRIPS_PATH}?queue=pending`
		case 'bookings_trip_request':
			return `${OPS_TRIPS_PATH}?queue=trip_request`
		case 'trips_open':
		case 'trips_booking':
		case 'trips_en_route':
		case 'trips_completed_7d_utc':
			return OPS_TRIPS_PATH
	}
}
