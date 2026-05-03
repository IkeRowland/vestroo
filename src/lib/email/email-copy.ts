/**
 * Shared transactional-email copy (server-safe; no secrets).
 */

/** Snippet embedded in account trip confirmation / quote emails (Epic 13). */
export const ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET =
	'Standard cancellations: notify us as soon as your plans change. Late cancellations or no-shows may ' +
	'be billed per your account agreement or our standard terms.'

/** Plain support address for `mailto:` and public CTAs (`SUPPORT_EMAIL` override). */
export function resolveSupportEmailAddress(): string {
	const raw = process.env.SUPPORT_EMAIL?.trim()
	return raw && raw.length > 0 ? raw : 'support@vestroo.com'
}

/** Customer-facing support inbox / env override (`SUPPORT_EMAIL`). */
export function resolveSupportContactLine(): string {
	const addr = resolveSupportEmailAddress()
	return `Questions? Reply to this email or write to ${addr}.`
}
