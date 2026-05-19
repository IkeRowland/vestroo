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

	const rows: ReferredBookingRow[] = (data ?? []).map((raw) => {
		const row = raw as Record<string, unknown>
		const embed = row.referrers
		const refObj = Array.isArray(embed) ? embed[0] : embed
		const referrers =
			refObj && typeof refObj === 'object'
				? {
						id: String((refObj as { id: unknown }).id),
						name: String((refObj as { name: unknown }).name),
						code:
							typeof (refObj as { code?: unknown }).code === 'string'
								? (refObj as { code: string }).code
								: null,
					}
				: null

		return {
			id: String(row.id),
			payment_reference:
				typeof row.payment_reference === 'string' ? row.payment_reference : null,
			customer_name: typeof row.customer_name === 'string' ? row.customer_name : null,
			pickup_datetime: typeof row.pickup_datetime === 'string' ? row.pickup_datetime : null,
			status: typeof row.status === 'string' ? row.status : null,
			total_amount:
				typeof row.total_amount === 'number' && Number.isFinite(row.total_amount)
					? row.total_amount
					: null,
			created_at: String(row.created_at),
			referrer_id: typeof row.referrer_id === 'string' ? row.referrer_id : null,
			referrers,
		}
	})

	return { rows, errorMessage: null }
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
