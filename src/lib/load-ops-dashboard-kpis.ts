import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import {
	OPS_DASHBOARD_KPI_ORDER,
	type OpsDashboardKpiId,
	opsDashboardKpiDrillHref,
	OPS_DASHBOARD_KPI_DEFINITIONS,
} from '@/lib/ops-dashboard-kpis'
import { OPS_NEW_BOOKINGS_ATTENTION_STATUSES } from '@/lib/ops-new-bookings-attention'
import { createUserServerClient } from '@/lib/supabase/server'

export type OpsDashboardKpiSnapshot = {
	id: OpsDashboardKpiId
	value: number
	title: string
	shortDefinition: string
	drillHref: string
	drillLabel: string
}

export type LoadOpsDashboardKpisResult =
	| {
			ok: true
			fetchedAtIso: string
			/** US-B2 attention metric only; list at `/ops/bookings` is unfiltered (US-B1). */
			newBookingsNeedsAttentionCount: number
			kpis: OpsDashboardKpiSnapshot[]
	  }
	| { ok: false; correlationId: string }

function rolling7dUtcBounds(): { fromIso: string; toIso: string } {
	const to = new Date()
	const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
	return { fromIso: from.toISOString(), toIso: to.toISOString() }
}

/**
 * Loads all v1 dashboard KPI counts in parallel (single batch of parallel queries).
 */
export async function loadOpsDashboardKpis(): Promise<LoadOpsDashboardKpisResult> {
	const correlationId = newOpsCorrelationId()
	const fetchedAtIso = new Date().toISOString()
	const supabase = await createUserServerClient()
	const { fromIso, toIso } = rolling7dUtcBounds()

	// Sequential counts: avoids Thundering Herd against PostgREST and keeps one
	// auth-backed client snapshot stable within the request (same semantics as parallel).
	const openRes = await supabase
		.from('trips')
		.select('id', { count: 'exact', head: true })
		.or('status.eq.booking,status.eq.assigned,status.eq.en_route')
	const bookingRes = await supabase
		.from('trips')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'booking')
	const enRouteRes = await supabase
		.from('trips')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'en_route')
	const completedRes = await supabase
		.from('trips')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'completed')
		.not('time_end_estimate', 'is', null)
		.gte('time_end_estimate', fromIso)
		.lte('time_end_estimate', toIso)
	const pendingRes = await supabase
		.from('bookings')
		.select('id', { count: 'exact', head: true })
		.or('booking_intent.is.null,booking_intent.neq.trip_request')
		.or('status.neq.paid,payment_status.neq.paid')
	const tripReqRes = await supabase
		.from('bookings')
		.select('id', { count: 'exact', head: true })
		.eq('booking_intent', 'trip_request')

	const newBookingsAttentionRes = await supabase
		.from('bookings')
		.select('id', { count: 'exact', head: true })
		.in('status', [...OPS_NEW_BOOKINGS_ATTENTION_STATUSES])

	const errors = [
		openRes.error,
		bookingRes.error,
		enRouteRes.error,
		completedRes.error,
		pendingRes.error,
		tripReqRes.error,
		newBookingsAttentionRes.error,
	].filter(Boolean)

	if (errors.length > 0) {
		const first = errors[0]
		const postgrestCode =
			first && typeof (first as { code?: string }).code === 'string'
				? (first as { code: string }).code
				: null
		logOpsAction({
			action: 'ops_dashboard_load_aggregates',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'aggregate_query_failed',
			hint: 'supabase_head_count_error',
			...(postgrestCode ? { meta: { postgrestCode } } : {}),
		})
		return { ok: false, correlationId }
	}

	const values: Record<OpsDashboardKpiId, number> = {
		trips_open: openRes.count ?? 0,
		trips_booking: bookingRes.count ?? 0,
		trips_en_route: enRouteRes.count ?? 0,
		trips_completed_7d_utc: completedRes.count ?? 0,
		bookings_pending_payment: pendingRes.count ?? 0,
		bookings_trip_request: tripReqRes.count ?? 0,
	}

	const kpis: OpsDashboardKpiSnapshot[] = OPS_DASHBOARD_KPI_ORDER.map((id) => {
		const def = OPS_DASHBOARD_KPI_DEFINITIONS[id]
		return {
			id,
			value: values[id],
			title: def.title,
			shortDefinition: def.shortDefinition,
			drillHref: opsDashboardKpiDrillHref(id),
			drillLabel: def.drillLabel,
		}
	})

	return {
		ok: true,
		fetchedAtIso,
		newBookingsNeedsAttentionCount: newBookingsAttentionRes.count ?? 0,
		kpis,
	}
}
