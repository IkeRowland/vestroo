/**
 * Story 14.7 (US-D3) — `QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS` (server-only).
 * When unset/empty, quote-first is **ON** (post-14.7 product default). Explicitly **OFF**:
 * `0` | `false` | `no` | `off` (case-insensitive, after trim). Any other non-empty value
 * (e.g. `1`, `true`, `yes`, `on`) is **ON**.
 */
const EXPLICITLY_OFF = new Set(['0', 'false', 'no', 'off'])

export function isQuoteFirstForNonTrivialIntentsEnabled(): boolean {
	const raw = process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS
	if (raw === undefined || raw === '') {
		return true
	}
	return !EXPLICITLY_OFF.has(raw.trim().toLowerCase())
}

/** Intents that use quote-first when the flag is ON (walk-in; excludes `point_to_point` and `corporate_pattern`). */
export function isQuoteFirstNonTrivialBookingIntent(
	intent: string
): intent is 'hourly_hire' | 'experience_package' | 'trip_request' {
	return (
		intent === 'hourly_hire' ||
		intent === 'experience_package' ||
		intent === 'trip_request'
	)
}
