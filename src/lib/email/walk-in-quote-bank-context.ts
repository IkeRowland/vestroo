import type { SupabaseClient } from '@supabase/supabase-js'

import {
	formatPaymentReference,
	loadOpsBankAccount,
	type OpsBankAccountDetails,
} from '@/lib/email/ops-bank-account-settings'

/**
 * Epic 16 / Story **16.15** (Theme N / US-N4) — server-side bank-account context for the
 * walk-in quote customer email.
 *
 * **Server-side only — must NEVER be imported from `'use client'` components or public
 * route handlers.** The module reads the unmasked `ops_settings.bank_account` JSON via a
 * caller-provided `SupabaseClient`. The intended caller is `sendWalkInQuote` (a `'use server'`
 * action) which passes a service-role client created from `SUPABASE_SERVICE_ROLE_KEY` — that
 * env var is not available in the browser bundle, so a stray client-side import would fail
 * to construct a privileged client at runtime. The helper itself is pure-by-parameter (no
 * direct env reads / no `createServiceRoleClient()` call) which keeps it testable while
 * pushing credential ownership to the caller.
 *
 * The customer email needs the **full** account number (not the dispatcher-masked shape
 * from `getBankAccountForReader`), so this helper goes directly to the seeded row from
 * Story 16.11 / N1 and shapes a flat DTO for `renderWalkInQuoteHtml`.
 */
export type WalkInQuoteBankAccountDetails = OpsBankAccountDetails

const DEFAULT_REFERENCE_FORMAT = 'VST-{booking_ref}'

export type LoadWalkInQuoteBankContextResult =
	| {
			ok: true
			bankAccount: WalkInQuoteBankAccountDetails
			paymentReference: string
			referenceFormat: string
	  }
	| {
			ok: false
			error: 'NOT_CONFIGURED' | 'MALFORMED' | 'INCOMPLETE' | 'DATABASE'
			message: string
	  }

/**
 * Substitutes `{booking_ref}` in the configured `reference_format` with the booking
 * reference. Falls back to `VST-{booking_ref}` when the template is empty/whitespace,
 * matching the seed default introduced by Story 16.11. Substitution is case-sensitive
 * per epic Q31 product lock — `reference_format` is staff-curated copy, not user input.
 */
export function formatBankReference(template: string | null | undefined, bookingRef: string): string {
	const ref = bookingRef.trim()
	const raw = typeof template === 'string' ? template.trim() : ''
	const tpl = raw.length > 0 ? raw : DEFAULT_REFERENCE_FORMAT
	return formatPaymentReference(tpl, { booking_ref: ref })
}

/**
 * Loads the seeded `ops_settings` row (`key = 'bank_account'`) using a service-role
 * Supabase client and shapes a customer-facing DTO + computed payment reference.
 *
 * Hard-fail philosophy (US-N4): if the row is missing, the JSON is malformed, or any
 * required field is empty, return a structured failure so the caller (`sendWalkInQuote`)
 * can short-circuit *before* sending an email with blank EFT details. The customer must
 * never receive a quote email that asks them to pay without bank info.
 */
export async function loadWalkInQuoteBankContext(
	serviceSupabase: SupabaseClient,
	bookingRef: string,
): Promise<LoadWalkInQuoteBankContextResult> {
	const loaded = await loadOpsBankAccount(serviceSupabase)
	if (!loaded.ok) {
		if (loaded.error === 'NOT_CONFIGURED') {
			return {
				ok: false,
				error: loaded.error,
				message: loaded.message,
			}
		}
		return { ok: false, error: loaded.error, message: loaded.message }
	}

	const referenceFormat =
		loaded.rawReferenceFormat.length > 0 ? loaded.rawReferenceFormat : DEFAULT_REFERENCE_FORMAT
	const paymentReference = formatBankReference(loaded.rawReferenceFormat, bookingRef)

	return {
		ok: true,
		bankAccount: loaded.bankAccount,
		paymentReference,
		referenceFormat,
	}
}
