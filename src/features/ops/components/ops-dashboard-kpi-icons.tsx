import type { LucideIcon } from 'lucide-react'
import {
	CheckCircle2,
	Clock,
	Layers,
	MessageSquarePlus,
	Truck,
	Wallet,
} from 'lucide-react'

import type { OpsDashboardKpiId } from '@/lib/ops-dashboard-kpis'

/** Lucide icons for `/ops` dashboard KPI scorecards (FE.17.4). */
export const OPS_DASHBOARD_KPI_ICONS: Record<OpsDashboardKpiId, LucideIcon> = {
	trips_open: Layers,
	trips_booking: Clock,
	trips_en_route: Truck,
	trips_completed_7d_utc: CheckCircle2,
	bookings_pending_payment: Wallet,
	bookings_trip_request: MessageSquarePlus,
}
