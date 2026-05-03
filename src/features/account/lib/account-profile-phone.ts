import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'

/**
 * Normalises optional profile phone to E.164 for `profiles.phone`, aligned with
 * {@link passengerPhoneToE164} in `trip-request-submit-schema.ts` (libphonenumber-js).
 *
 * @returns `''` when input is empty (clear field). `null` when non-empty but invalid.
 */
export function accountProfilePhoneToE164(raw: string, defaultCountry: CountryCode): string | null {
	const trimmed = raw.trim()
	if (!trimmed) return ''

	let parsed = parsePhoneNumberFromString(trimmed, defaultCountry)
	if (!parsed?.isValid()) {
		parsed = parsePhoneNumberFromString(trimmed)
	}
	if (!parsed?.isValid()) return null
	return parsed.number
}
