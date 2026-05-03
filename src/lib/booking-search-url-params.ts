import type { BookSearchUrlPrefill } from '@/features/booking/components/BookingSearchForm'

export type BookingSearchUrlParamsInput = {
	tab?: string
	modify?: string
	originHint?: string
	destinationHint?: string
	passengers?: string
	intent?: string
	serviceTypeHint?: string
	omitTripDate?: string
}

export function parseBookingSearchUrlParams(sp: BookingSearchUrlParamsInput): {
	initialTab: 'create-booking' | 'modify-booking'
	bookSearchPrefill: BookSearchUrlPrefill | null
	modifyPrefillRef: string | null
} {
	const { tab, modify } = sp
	const initialTab =
		tab === 'login' || (modify && modify.trim() !== '') ? 'modify-booking' : 'create-booking'

	const omitTripDate = sp.omitTripDate === '1'
	const passengersParsed = sp.passengers ? Number.parseInt(sp.passengers, 10) : Number.NaN
	const hasPrefillKeys =
		Boolean(sp.originHint?.trim()) ||
		Boolean(sp.destinationHint?.trim()) ||
		Boolean(sp.passengers?.trim()) ||
		Boolean(sp.intent?.trim()) ||
		Boolean(sp.serviceTypeHint?.trim()) ||
		omitTripDate

	const bookSearchPrefill: BookSearchUrlPrefill | null = hasPrefillKeys
		? {
				originHint: sp.originHint?.trim() || undefined,
				destinationHint: sp.destinationHint?.trim() || undefined,
				passengers:
					Number.isFinite(passengersParsed) && passengersParsed > 0 ? passengersParsed : undefined,
				intent: sp.intent?.trim() || null,
				serviceTypeHint: sp.serviceTypeHint?.trim() || null,
				omitTripDate,
			}
		: null

	const modifyPrefillRef = typeof modify === 'string' && modify.trim() !== '' ? modify.trim() : null

	return { initialTab, bookSearchPrefill, modifyPrefillRef }
}
