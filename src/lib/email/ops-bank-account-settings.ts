import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Epic 16 / Theme N — shared loader for **`ops_settings`** row **`key = bank_account`** (full
 * unmasked JSON for customer email render). Used by **16.15** walk-in quotes and **16.16**
 * account invoice comms — **never** import from `'use client'` bundles.
 */

export type OpsBankAccountDetails = {
	bank_name: string
	account_holder: string
	account_number: string
	branch_code: string
}

export type LoadOpsBankAccountFailureCode =
	| 'NOT_CONFIGURED'
	| 'MALFORMED'
	| 'INCOMPLETE'
	| 'DATABASE'

export type LoadOpsBankAccountResult =
	| {
			ok: true
			bankAccount: OpsBankAccountDetails
			/** Trimmed `reference_format` from JSON, or empty when absent (caller applies walk-in default). */
			rawReferenceFormat: string
			/** Optional staff override for invoice EFT references (`{invoice_number}`, `{booking_ref}`). */
			rawInvoiceReferenceFormat: string | null
	  }
	| {
			ok: false
			error: LoadOpsBankAccountFailureCode
			message: string
	  }

const BANK_ACCOUNT_SETTINGS_KEY = 'bank_account' as const

type BankAccountSettingsRowShape = {
	bank_name?: unknown
	account_holder?: unknown
	account_number?: unknown
	branch_code?: unknown
	reference_format?: unknown
	invoice_reference_format?: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asTrimmedString(value: unknown): string {
	if (typeof value === 'string') return value.trim()
	if (typeof value === 'number' && Number.isFinite(value)) return String(value).trim()
	return ''
}

/**
 * Substitutes `{token}` placeholders using **case-sensitive** keys from `substitutions`.
 * Tokens not present in the map are left unchanged (caller should supply all configured tokens).
 */
export function formatPaymentReference(
	template: string | null | undefined,
	substitutions: Record<string, string>,
): string {
	const raw = typeof template === 'string' ? template : ''
	let out = raw
	for (const [key, val] of Object.entries(substitutions)) {
		const needle = `{${key}}`
		out = out.split(needle).join(val)
	}
	return out
}

/**
 * Loads **`ops_settings.bank_account`** via the caller’s Supabase client (typically service-role).
 * Hard-fail shape matches **16.15** — callers short-circuit before sending customer email when `ok` is false.
 */
/**
 * Derives the customer-visible EFT reference for **account invoice** comms (**16.16**).
 * Prefer **`bookings.external_invoice_ref`** when set; otherwise fall back to the booking’s
 * **`payment_reference`** (fail-soft — **not** the N4 `VST-{booking_ref}` template).
 * Optional **`invoice_reference_format`** uses **`formatPaymentReference`** with `{invoice_number}` /
 * `{booking_ref}` tokens.
 */
export function resolveAccountInvoiceEftReference(input: {
	rawInvoiceReferenceFormat: string | null
	externalInvoiceRef: string | null | undefined
	paymentReferenceField: string | null | undefined
	bookingRefLabel: string
}): string {
	const ext =
		typeof input.externalInvoiceRef === 'string' && input.externalInvoiceRef.trim() !== '' ?
			input.externalInvoiceRef.trim()
		:	''
	const pay =
		typeof input.paymentReferenceField === 'string' && input.paymentReferenceField.trim() !== '' ?
			input.paymentReferenceField.trim()
		:	''
	const primary = ext !== '' ? ext : pay
	const bookingRef = input.bookingRefLabel.trim()
	const fmt = input.rawInvoiceReferenceFormat?.trim()
	if (fmt && fmt.length > 0) {
		return formatPaymentReference(fmt, {
			invoice_number: primary,
			booking_ref: bookingRef,
		})
	}
	return primary !== '' ? primary : '—'
}

export async function loadOpsBankAccount(
	serviceSupabase: SupabaseClient,
): Promise<LoadOpsBankAccountResult> {
	const { data, error } = await serviceSupabase
		.from('ops_settings')
		.select('value')
		.eq('key', BANK_ACCOUNT_SETTINGS_KEY)
		.maybeSingle()

	if (error) {
		return {
			ok: false,
			error: 'DATABASE',
			message: `Could not load bank account settings: ${error.message}`,
		}
	}

	if (!data || !isPlainObject(data.value)) {
		return {
			ok: false,
			error: 'NOT_CONFIGURED',
			message:
				'Bank account settings are not configured. An admin can set them under Operations → Bank account (EFT) (/ops/settings/bank-account).',
		}
	}

	const value = data.value as BankAccountSettingsRowShape
	const bankName = asTrimmedString(value.bank_name)
	const accountHolder = asTrimmedString(value.account_holder)
	const accountNumber = asTrimmedString(value.account_number)
	const branchCode = asTrimmedString(value.branch_code)
	const rawReferenceFormat = asTrimmedString(value.reference_format)
	const invFmtRaw = asTrimmedString(value.invoice_reference_format)

	const missing: string[] = []
	if (bankName === '') missing.push('bank_name')
	if (accountHolder === '') missing.push('account_holder')
	if (accountNumber === '') missing.push('account_number')
	if (branchCode === '') missing.push('branch_code')

	if (missing.length > 0) {
		return {
			ok: false,
			error: 'INCOMPLETE',
			message: `Bank account settings are incomplete (missing: ${missing.join(', ')}). Complete them under Operations → Bank account (EFT) (/ops/settings/bank-account).`,
		}
	}

	return {
		ok: true,
		bankAccount: {
			bank_name: bankName,
			account_holder: accountHolder,
			account_number: accountNumber,
			branch_code: branchCode,
		},
		rawReferenceFormat,
		rawInvoiceReferenceFormat: invFmtRaw.length > 0 ? invFmtRaw : null,
	}
}
