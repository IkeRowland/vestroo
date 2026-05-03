import type { SupabaseClient } from '@supabase/supabase-js'

import type { NotDispatchableAccountDetail } from '@/lib/ops-action-result'

function isUnpaidBooking(paymentStatus: string | null | undefined): boolean {
	return (paymentStatus ?? 'pending') !== 'paid'
}

function isActiveBookingStatus(status: string | null | undefined): boolean {
	const s = status ?? ''
	return s !== 'cancelled' && s !== 'expired'
}

/**
 * Outstanding unpaid booked trips for the account — matches `can_dispatch_account_booking` credit gate
 * (bookings that already have a `booking_trips` row, non-cancelled, unpaid).
 */
async function sumOutstandingTrippedUnpaidZar(
	supabase: SupabaseClient,
	customerAccountId: string,
): Promise<number> {
	const { data: rows, error } = await supabase
		.from('bookings')
		.select('total_amount, payment_status, status, booking_trips!inner(trip_id)')
		.eq('customer_account_id', customerAccountId)

	if (error || !rows?.length) {
		return 0
	}

	let sum = 0
	for (const r of rows as {
		total_amount: number | null
		payment_status: string | null
		status?: string | null
	}[]) {
		if (!isActiveBookingStatus(r.status)) {
			continue
		}
		if (!isUnpaidBooking(r.payment_status)) {
			continue
		}
		sum += Number(r.total_amount ?? 0)
	}
	return sum
}

async function countOverdueInvoices(
	supabase: SupabaseClient,
	customerAccountId: string,
	creditTermsDays: number,
): Promise<number> {
	const cutoff = new Date()
	cutoff.setDate(cutoff.getDate() - (creditTermsDays + 7))
	const cutoffIso = cutoff.toISOString()

	const { data: rows, error } = await supabase
		.from('bookings')
		.select('payment_status, status')
		.eq('customer_account_id', customerAccountId)
		.lt('created_at', cutoffIso)

	if (error || !rows?.length) {
		return 0
	}

	return rows.filter(
		(r) => isActiveBookingStatus(r.status) && isUnpaidBooking(r.payment_status),
	).length
}

/**
 * Structured fields for the **13.2** fulfil block panel — aligned with `can_dispatch_account_booking` inputs
 * (no duplicate business rules; numbers are read-only snapshots for display).
 */
export async function fetchNotDispatchableAccountDetail(
	supabase: SupabaseClient,
	args: {
		customerAccountId: string | null
		reasonCode: string
		bookingTotalAmount: number | null
	},
): Promise<NotDispatchableAccountDetail | undefined> {
	const { customerAccountId, reasonCode, bookingTotalAmount } = args
	if (!customerAccountId) {
		return undefined
	}

	switch (reasonCode) {
		case 'credit_limit_exceeded': {
			const { data: account } = await supabase
				.from('customer_accounts')
				.select('credit_limit_zar')
				.eq('id', customerAccountId)
				.maybeSingle()

			const outstanding = await sumOutstandingTrippedUnpaidZar(supabase, customerAccountId)
			return {
				outstanding_zar: outstanding,
				this_booking_zar: bookingTotalAmount ?? 0,
				credit_limit_zar: (account?.credit_limit_zar as number | null) ?? null,
			}
		}
		case 'contract_expired':
		case 'contract_not_yet_active': {
			const { data: account } = await supabase
				.from('customer_accounts')
				.select('contract_starts_on, contract_ends_on')
				.eq('id', customerAccountId)
				.maybeSingle()

			return {
				contract_starts_on: (account?.contract_starts_on as string | null) ?? null,
				contract_ends_on: (account?.contract_ends_on as string | null) ?? null,
			}
		}
		case 'overdue_invoices': {
			const { data: account } = await supabase
				.from('customer_accounts')
				.select('credit_terms_days')
				.eq('id', customerAccountId)
				.maybeSingle()

			const creditTermsDays =
				typeof account?.credit_terms_days === 'number' ? account.credit_terms_days : 0
			const overdue_invoice_count = await countOverdueInvoices(
				supabase,
				customerAccountId,
				creditTermsDays,
			)
			return { overdue_invoice_count }
		}
		default:
			return undefined
	}
}
