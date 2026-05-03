import type { ProfileRole } from '@/types/database.types'

/**
 * Parsed shape for `public.ops_settings` row with `key === 'bank_account'`.
 * Extra keys in `value` jsonb are preserved for admin; masking only touches `account_number`.
 */
export type BankAccountSettingsValue = {
	bank_name: string
	account_holder: string
	account_number: string
	branch_code: string
	reference_format: string
} & Record<string, unknown>

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Masks a stored account number for dispatcher-facing UIs: last four only when length ≥ 4; else fully redacted.
 * Epic: `***last4` (e.g. `***1234`).
 */
export function maskBankAccountNumberLastFour(raw: string): string {
	if (raw.length >= 4) {
		return `***${raw.slice(-4)}`
	}
	return '****'
}

/**
 * Server contract for surfacing `ops_settings` bank JSON: full value for admin, masked for dispatcher, forbidden elsewhere.
 * Callers should pass the parsed `value` column (not raw `ops_settings` row) to keep this pure and testable.
 */
export function getBankAccountForReader(
	reader: ProfileRole,
	value: unknown,
): BankAccountSettingsValue | null {
	if (!isPlainObject(value)) {
		return null
	}

	if (reader === 'admin') {
		return { ...value } as BankAccountSettingsValue
	}

	if (reader === 'dispatcher') {
		const out: Record<string, unknown> = { ...value }
		const n = out.account_number
		const s = n == null || n === '' ? '' : String(n)
		out.account_number = maskBankAccountNumberLastFour(s)
		return out as BankAccountSettingsValue
	}

	return null
}
