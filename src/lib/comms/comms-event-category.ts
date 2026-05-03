/**
 * Epic 15 / 15C.6 — `CommsEventKey` to `comms_preferences` category (`informational` | `marketing` | `transactional`).
 * Dev table (AC1) — do not use markdown bold inside table cells (build tooling).
 * - booking_submitted, quote_accepted, quote_rejected, payment_received, trip_*, trip_cancelled,
 *   invoice_due_reminder, member_invited: transactional; payment and trips bypass informational/marketing toggles when such checks exist.
 * - quote_sent_account, quote_sent_walk_in: informational (quote updates; opt-out via informational in portal).
 * - marketing: reserved; no `CommsEventKey` uses it in this repo yet.
 * AC9 / 15.20: transactional sends are not skipped for marketing: false; no preference gate in dispatch in this story.
 * @see `src/types/comms-preferences.ts` — `CommsPreferenceCategoryKey`
 * @see `src/types/comms.ts` — `CommsEventKey` list
 */
import type { CommsEventKey } from '@/types/comms'
import type { CommsPreferenceCategoryKey } from '@/types/comms-preferences'

const QUOTE_INFO_KEYS = new Set<CommsEventKey>(['quote_sent_account', 'quote_sent_walk_in'])

const TRIP_KEYS: CommsEventKey[] = [
	'trip_assigned',
	'trip_en_route',
	'trip_completed',
	'trip_cancelled',
]

const TRANSACTIONAL_KEYS = new Set<CommsEventKey>([
	'booking_submitted',
	'quote_accepted',
	'quote_rejected',
	'payment_received',
	'invoice_due_reminder',
	'member_invited',
	...TRIP_KEYS,
])

const MARKETING_KEYS = new Set<CommsEventKey>()

/**
 * **Preference / footer classification** for matrix HTML email — aligns with `comms_preferences` keys in **15C.5**.
 * **Note:** `marketing` is reserved; no current **`CommsEventKey`** maps to it; quote sends use **`informational`**.
 */
export function getCommsEventCommsCategory(eventKey: CommsEventKey): CommsPreferenceCategoryKey {
	if (MARKETING_KEYS.has(eventKey)) {
		return 'marketing'
	}
	if (QUOTE_INFO_KEYS.has(eventKey)) {
		return 'informational'
	}
	if (TRANSACTIONAL_KEYS.has(eventKey)) {
		return 'transactional'
	}
	// New keys in TS before mapping update → default to transactional
	return 'transactional'
}

/** For **`?category=`** in email links and headers (never **`transactional`** in unsubscribe CTA). */
export function getAccountPrefsDeepLinkCategory(
	eventKey: CommsEventKey,
): 'informational' | 'marketing' | null {
	const c = getCommsEventCommsCategory(eventKey)
	if (c === 'transactional') return null
	if (c === 'informational' || c === 'marketing') return c
	return null
}
