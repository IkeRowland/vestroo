/**
 * Epic 15 / **15C.5** — per-**`customer_account_members`** email comms categories (**US-B3**, **Q24**).
 * Canonical **`comms_preferences` jsonb keys** for **`15C.2`** send-time checks and **`15C.6`** unsubscribe deep links.
 *
 * **Defaults (POPIA + epic):** informational **on**, marketing **off** until explicit opt-in, transactional **always on** (locked).
 */
export const COMMS_PREFERENCE_CATEGORY_KEYS = [
	'informational',
	'marketing',
	'transactional',
] as const

export type CommsPreferenceCategoryKey = (typeof COMMS_PREFERENCE_CATEGORY_KEYS)[number]

export type CommsPreferencesState = {
	informational: boolean
	marketing: boolean
	/** Always `true` when persisted; UI shows locked “on”. */
	transactional: boolean
}

export const DEFAULT_COMMS_PREFERENCES: CommsPreferencesState = {
	informational: true,
	marketing: false,
	transactional: true,
}

const CATEGORY_SET = new Set<string>(COMMS_PREFERENCE_CATEGORY_KEYS)

export function isCommsPreferenceCategoryKey(value: string): value is CommsPreferenceCategoryKey {
	return CATEGORY_SET.has(value)
}

/** **`?category=`** query for **`15C.6`** unsubscribe landing (canonical for this repo). */
export function parseAccountPrefsCategoryQuery(
	raw: string | string[] | undefined,
): CommsPreferenceCategoryKey | null {
	if (raw == null) return null
	const s = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase()
	if (!s || !isCommsPreferenceCategoryKey(s)) return null
	return s
}

function readBool(value: unknown, fallback: boolean): boolean {
	if (typeof value === 'boolean') return value
	if (value === 'true') return true
	if (value === 'false') return false
	return fallback
}

/**
 * Normalises **`comms_preferences`** from DB (null / partial object) into a full **`CommsPreferencesState`** for UI.
 * Does **not** persist — call **`set_member_comms_preferences`** (or defaults on first save) to store.
 */
export function normalizeCommsPreferencesFromDb(raw: unknown): CommsPreferencesState {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ...DEFAULT_COMMS_PREFERENCES }
	}
	const o = raw as Record<string, unknown>
	return {
		informational: readBool(o.informational, DEFAULT_COMMS_PREFERENCES.informational),
		marketing: readBool(o.marketing, DEFAULT_COMMS_PREFERENCES.marketing),
		transactional: true,
	}
}

export function toCommsPreferencesJsonb(state: CommsPreferencesState): Record<string, boolean> {
	return {
		informational: state.informational,
		marketing: state.marketing,
		transactional: true,
	}
}
