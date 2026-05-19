import type { AccountPortalBookingDetailRow } from '@/lib/account-booking-detail'
import type { OpsBookingQuoteDetailRow } from '@/lib/booking-current-quote'

export type AccountBookingTimelineItem = {
	at: string
	kind: string
	label: string
}

export type AccountBookingRailDetail = {
	booking: AccountPortalBookingDetailRow
	quote: OpsBookingQuoteDetailRow | null
	/** List/detail amount column — quote total when saved, else `bookings.total_amount`. */
	displayAmountZar: number | null
	staticMapUrl: string | null
	timeline: AccountBookingTimelineItem[]
	trip: {
		serviceType: string | null
		chauffeurAssigned: boolean
		vehicleClassLabel: string | null
		/** Fleet vehicle name when ops confirmed and RLS allows read. */
		assignedFleetVehicleName: string | null
	}
	driver: {
		assigned: boolean
		displayName: string | null
		avatarUrl: string | null
	}
	receiptQuoteId: string | null
}
