'use server'

import { z } from 'zod'

import { createServiceRoleClient, createUserServerClient } from '@/lib/supabase/server'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

const inputSchema = z.object({
	quoteId: z.string().uuid(),
})

const DEFAULT_QUOTE_PDF_BUCKET = 'booking-quote-pdfs'

/**
 * **Story 18.6** — short-lived signed URL for **`booking_quotes.pdf_storage_path`** after portal admin scoping.
 * Uses **service role** for signing only after membership + row checks with the user-scoped client.
 */
export async function accountPortalInvoicePdfSignedUrl(
	input: unknown,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
	const parsed = inputSchema.safeParse(input)
	if (!parsed.success) {
		return { ok: false, error: 'Invalid request.' }
	}

	const userSb = await createUserServerClient()
	const {
		data: { user },
		error: uErr,
	} = await userSb.auth.getUser()
	if (uErr || !user) {
		return { ok: false, error: 'Not signed in.' }
	}

	const { data: row, error: qErr } = await userSb
		.from('booking_quotes')
		.select(
			`
      id,
      pdf_storage_path,
      bookings!booking_id!inner (
        customer_account_id,
        client_type
      )
    `,
		)
		.eq('id', parsed.data.quoteId)
		.maybeSingle()

	if (qErr || !row) {
		return { ok: false, error: 'Quote not found.' }
	}

	const raw = row as {
		id: string
		pdf_storage_path: string | null
		bookings: { customer_account_id: string | null; client_type: string | null } | { customer_account_id: string | null; client_type: string | null }[] | null
	}
	const b = Array.isArray(raw.bookings) ? raw.bookings[0] : raw.bookings
	if (!b?.customer_account_id || b.client_type !== 'account_client') {
		return { ok: false, error: 'Quote not found.' }
	}

	const { data: mem } = await userSb
		.from('customer_account_members')
		.select('role')
		.eq('profile_id', user.id)
		.eq('account_id', b.customer_account_id)
		.not('accepted_at', 'is', null)
		.maybeSingle()

	const role = mem?.role as CustomerAccountMemberRoleDb | undefined
	if (role !== 'admin') {
		return { ok: false, error: 'Not allowed.' }
	}

	const objectPath = typeof raw.pdf_storage_path === 'string' ? raw.pdf_storage_path.trim() : ''
	if (!objectPath) {
		return { ok: false, error: 'No PDF on file for this quote.' }
	}

	const bucket = (process.env.SUPABASE_BOOKING_QUOTE_PDF_BUCKET ?? DEFAULT_QUOTE_PDF_BUCKET).trim()

	let service
	try {
		service = await createServiceRoleClient()
	} catch {
		return { ok: false, error: 'Download is not configured on this server.' }
	}

	const { data: signed, error: sErr } = await service.storage.from(bucket).createSignedUrl(objectPath, 120)
	if (sErr || !signed?.signedUrl) {
		return { ok: false, error: 'Could not create download link.' }
	}

	return { ok: true, url: signed.signedUrl }
}
