import type { SupabaseClient } from '@supabase/supabase-js'

import type { ReferrerRow } from '@/lib/referrer-types'

export type ReferredBookingRow = {
	id: string
	payment_reference: string | null
	customer_name: string | null
	pickup_datetime: string | null
	status: string | null
	total_amount: number | null
	created_at: string
	referrer_id: string | null
	referrers: { id: string; name: string; code: string | null } | null
}

export async function fetchReferrersForOps(
	supabase: SupabaseClient,
): Promise<{ rows: ReferrerRow[]; errorMessage: string | null }> {
	const { data, error } = await supabase
		.from('referrers')
		.select('id, name, code, email, status, commission_rate, created_at')
		.order('name', { ascending: true })

	if (error) {
		return { rows: [], errorMessage: error.message }
	}
	return { rows: (data ?? []) as ReferrerRow[], errorMessage: null }
}

export async function fetchReferredBookingsForOps(
	supabase: SupabaseClient,
	limit = 200,
): Promise<{ rows: ReferredBookingRow[]; errorMessage: string | null }> {
	const { data, error } = await supabase
		.from('bookings')
		.select(
			`
      id, payment_reference, customer_name, pickup_datetime, status, total_amount, created_at, referrer_id,
      referrers ( id, name, code )
    `,
		)
		.not('referrer_id', 'is', null)
		.order('created_at', { ascending: false })
		.limit(limit)

	if (error) {
		return { rows: [], errorMessage: error.message }
	}
	return { rows: (data ?? []) as ReferredBookingRow[], errorMessage: null }
}

export function countBookingsPerReferrer(
	bookings: ReferredBookingRow[],
): Map<string, number> {
	const counts = new Map<string, number>()
	for (const b of bookings) {
		const id = b.referrer_id
		if (!id) continue
		counts.set(id, (counts.get(id) ?? 0) + 1)
	}
	return counts
}
