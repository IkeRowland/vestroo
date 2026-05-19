import type { SupabaseClient } from '@supabase/supabase-js'

import {
	OPS_BOOKINGS_QUEUE_SELECT,
	type OpsBookingsQueueRow,
} from '@/lib/ops-bookings-queue-select'
import type { OpsBookingIntentFilterValue } from '@/lib/ops-booking-grid-query'
import type { OpsBookingsQueueParsed } from '@/lib/ops-bookings-queue-query'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyQueueFiltersToBookingsQuery(query: any, parsed: OpsBookingsQueueParsed) {
	let q = query
	if (parsed.statuses.length > 0) {
		q = q.in('status', parsed.statuses)
	}
	if (parsed.payments.length > 0) {
		q = q.in('payment_status', parsed.payments)
	}

	const hasNullIntent = parsed.intents.includes('_null')
	const concreteIntents = parsed.intents.filter(
		(i): i is Exclude<OpsBookingIntentFilterValue, '_null' | ''> => i !== '_null' && i !== '',
	)
	if (hasNullIntent && concreteIntents.length === 0) {
		q = q.is('booking_intent', null)
	} else if (!hasNullIntent && concreteIntents.length > 0) {
		q = q.in('booking_intent', concreteIntents)
	} else if (hasNullIntent && concreteIntents.length > 0) {
		q = q.or(`booking_intent.is.null,booking_intent.in.(${concreteIntents.join(',')})`)
	}

	return q
}

export type FetchAccountClientBookingsResult = {
	rows: OpsBookingsQueueRow[]
	totalCount: number
	errorMessage: string | null
}

/** Bookings for one account client with the same queue filters as `/ops/bookings`. */
export async function fetchAccountClientBookings(
	supabase: SupabaseClient,
	accountId: string,
	parsed: OpsBookingsQueueParsed,
): Promise<FetchAccountClientBookingsResult> {
	const scopedParsed: OpsBookingsQueueParsed = {
		...parsed,
		clients: ['account_client'],
	}

	const countRes = await applyQueueFiltersToBookingsQuery(
		supabase
			.from('bookings')
			.select('*', { count: 'exact', head: true })
			.eq('customer_account_id', accountId)
			.eq('client_type', 'account_client'),
		scopedParsed,
	)

	if (countRes.error) {
		return { rows: [], totalCount: 0, errorMessage: countRes.error.message }
	}

	const totalCount = countRes.count ?? 0
	const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / parsed.perPage)
	const safePage = Math.min(Math.max(1, parsed.page), Math.max(totalPages, 1))
	const rangeFrom = (safePage - 1) * parsed.perPage
	const rangeTo = rangeFrom + parsed.perPage - 1

	const listRes = await applyQueueFiltersToBookingsQuery(
		supabase
			.from('bookings')
			.select(OPS_BOOKINGS_QUEUE_SELECT)
			.eq('customer_account_id', accountId)
			.eq('client_type', 'account_client'),
		scopedParsed,
	)
		.order('created_at', { ascending: false })
		.range(rangeFrom, rangeTo)

	if (listRes.error) {
		return { rows: [], totalCount, errorMessage: listRes.error.message }
	}

	return {
		rows: (listRes.data ?? []) as OpsBookingsQueueRow[],
		totalCount,
		errorMessage: null,
	}
}
