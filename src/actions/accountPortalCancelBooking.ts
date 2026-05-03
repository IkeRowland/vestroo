'use server'

import { z } from 'zod'

import { createServerClient, createUserServerClient } from '@/lib/supabase/server'
import { accountBookingsCopy } from '@/features/account/copy/account-bookings-copy'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

const inputSchema = z.object({
	bookingId: z.string().uuid(),
})

/**
 * Account portal cancellation: verifies active-account membership, unpaid, non-terminal, then cancels.
 * Session replaces guest phone proof.
 */
export async function accountPortalCancelBooking(
	input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
	const parsed = inputSchema.safeParse(input)
	if (!parsed.success) {
		return { success: false, error: 'Invalid request.' }
	}
	const { bookingId } = parsed.data

	const userSb = await createUserServerClient()
	const {
		data: { user },
		error: uErr,
	} = await userSb.auth.getUser()
	if (uErr || !user) {
		return { success: false, error: 'Not signed in.' }
	}

	const { data: row, error: fetchError } = await userSb
		.from('bookings')
		.select('id, status, payment_status, customer_account_id, client_type')
		.eq('id', bookingId)
		.maybeSingle()

	if (fetchError || !row) {
		return { success: false, error: 'Booking not found.' }
	}

	if (row.client_type !== 'account_client' || !row.customer_account_id) {
		return { success: false, error: 'Booking not found.' }
	}

	const { data: mem } = await userSb
		.from('customer_account_members')
		.select('role')
		.eq('profile_id', user.id)
		.eq('account_id', row.customer_account_id)
		.not('accepted_at', 'is', null)
		.maybeSingle()

	if (!mem?.role) {
		return { success: false, error: 'Booking not found.' }
	}

	const role = mem.role as CustomerAccountMemberRoleDb
	if (role !== 'booker' && role !== 'admin') {
		return { success: false, error: accountBookingsCopy.modifyNotAllowed }
	}

	if (row.status === 'cancelled' || row.status === 'expired') {
		return { success: true }
	}

	if (row.status === 'completed' || row.status === 'invoiced' || row.status === 'paid_invoice') {
		return { success: false, error: 'This trip can no longer be self-cancelled. Contact your account team.' }
	}

	if (row.payment_status === 'paid') {
		return {
			success: false,
			error:
				'This trip is already paid. Use contact to change or cancel — we may need to re-issue the invoice.',
		}
	}

	const admin = await createServerClient()
	const { error: updateError } = await admin
		.from('bookings')
		.update({ status: 'cancelled' as const })
		.eq('id', bookingId)

	if (updateError) {
		return { success: false, error: accountBookingsCopy.cancelErrorGeneric }
	}
	return { success: true }
}
