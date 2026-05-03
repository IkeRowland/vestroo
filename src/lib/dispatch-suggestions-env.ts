/**
 * Epic 15 / **15D.2** — deploy switch for Fulfil “Suggested vehicles” (server-only).
 * Same truthy parsing as {@link isSmsEnabled} in `src/services/sms.ts` / rider live map env.
 */
export function isDispatchSuggestionsEnabled(): boolean {
	const v = process.env.DISPATCH_SUGGESTIONS_ENABLED
	if (v === undefined) return false
	const t = v.trim().toLowerCase()
	return t === '1' || t === 'true' || t === 'yes' || t === 'on'
}
