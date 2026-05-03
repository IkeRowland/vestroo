import { COMMS_DISPATCH_RECIPIENT_ROLES } from '@/types/comms'

const RECIPIENT_ROLE_SET = new Set<string>(COMMS_DISPATCH_RECIPIENT_ROLES)

/**
 * Parses **`recipient_filter`** JSON for **`comms_dispatch_rules`** updates.
 * Rejects non-objects, arrays, and **`null`** so we never silently coerce invalid input to **`{}`**.
 */
export function parseCommsRecipientFilterJson(raw: string):
	| { ok: true; value: Record<string, unknown> }
	| { ok: false; message: string } {
	const trimmed = raw.trim()
	if (trimmed === '') {
		return { ok: false, message: 'Recipient filter JSON cannot be empty.' }
	}
	let parsed: unknown
	try {
		parsed = JSON.parse(trimmed) as unknown
	} catch {
		return { ok: false, message: 'Recipient filter is not valid JSON.' }
	}
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return {
			ok: false,
			message: 'Recipient filter must be a JSON object (e.g. {}).',
		}
	}
	return { ok: true, value: parsed as Record<string, unknown> }
}

export function isCommsDispatchRecipientRole(value: string): boolean {
	return RECIPIENT_ROLE_SET.has(value)
}
