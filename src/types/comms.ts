/**
 * Epic 15 / **15C.1** — comms matrix vocabulary (`comms_templates`, `comms_dispatch_rules`).
 * Per-member email category keys for sends live in **`src/types/comms-preferences.ts`** (**15C.5**).
 * **15C.6** — each **`CommsEventKey` → `informational` | `marketing` | `transactional`** for footers: **`src/lib/comms/comms-event-category.ts`**.
 * DB stores `event_key` / `channel` as text with checks; **app** should use these types for new code (**15C.2+**).
 * **Q23:** template bodies remain PR-reviewed (migrations / seeds); not edited via portal JWT.
 */

/** Minimum event keys (extensible — add here + migration comment when introducing new events). */
export const COMMS_EVENT_KEYS = [
	'booking_submitted',
	'quote_sent_account',
	'quote_sent_walk_in',
	'quote_accepted',
	'quote_rejected',
	'payment_received',
	'trip_assigned',
	'trip_en_route',
	'trip_completed',
	'trip_cancelled',
	'invoice_due_reminder',
	'member_invited',
] as const

export type CommsEventKey = (typeof COMMS_EVENT_KEYS)[number]

/** Channels persisted in DB (`comms_* .channel`); align with **15B.4** SMS + email. */
export type CommsChannel = 'email' | 'sms'

/** `public.comms_dispatch_rules.recipient_role` — migration `20260426104021_epic15_15c1_*`. */
export const COMMS_DISPATCH_RECIPIENT_ROLES = [
	'booker',
	'rider',
	'ops',
	'customer',
	'chauffeur',
	'dispatcher',
	'admin',
] as const

export type CommsDispatchRecipientRole = (typeof COMMS_DISPATCH_RECIPIENT_ROLES)[number]
