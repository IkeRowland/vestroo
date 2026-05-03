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
	staticMapUrl: string | null
	timeline: AccountBookingTimelineItem[]
	trip: {
		serviceType: string | null
		chauffeurAssigned: boolean
		vehicleClassLabel: string | null
	}
	driver: {
		assigned: boolean
		displayName: string | null
		avatarUrl: string | null
	}
	receiptQuoteId: string | null
}
