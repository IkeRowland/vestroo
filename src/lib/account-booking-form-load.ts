import type { BookSearchUrlPrefill, PortalRebookBootstrap } from '@/features/booking/components/BookingSearchForm'

/** Server-fed props for {@link AccountNewBookingSheet} / embedded portal booking flow. */
export type AccountBookingFormLoad = {
	bookSearchPrefill: BookSearchUrlPrefill | null
	portalRebookBootstrap: PortalRebookBootstrap | null
	tripRequestPhoneCountryIso2Hint: string | null
}
