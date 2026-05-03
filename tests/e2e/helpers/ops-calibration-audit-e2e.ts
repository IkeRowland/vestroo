import type { SupabaseClient } from '@supabase/supabase-js'

/** Mirrors **`src/lib/dispatch-suggestions-env.ts`** for Playwright gates (no server import). */
export function dispatchSuggestionsEnabledFromEnv(): boolean {
	const v = process.env.DISPATCH_SUGGESTIONS_ENABLED
	if (v === undefined) return false
	const t = v.trim().toLowerCase()
	return t === '1' || t === 'true' || t === 'yes' || t === 'on'
}

export function parseUuidEnv(value: string | undefined): string | null {
	const v = value?.trim()
	if (!v) return null
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
		return null
	}
	return v
}

function payloadBookingId(payload: unknown): string | null {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
	const raw = (payload as Record<string, unknown>).booking_id
	return typeof raw === 'string' ? raw : null
}

/**
 * Polls **`ops_audit_log`** with service role for **`15D.3`** calibration rows matching **`bookingId`**.
 */
export async function waitForCalibrationAssignAudit(
	svc: SupabaseClient,
	bookingId: string,
	action: 'assignment_from_suggestion' | 'assignment_free_pick',
	options?: { timeoutMs?: number; intervalMs?: number },
): Promise<Record<string, unknown>> {
	const timeoutMs = options?.timeoutMs ?? 90_000
	const intervalMs = options?.intervalMs ?? 1500
	const deadline = Date.now() + timeoutMs

	for (;;) {
		const { data, error } = await svc
			.from('ops_audit_log')
			.select('action, payload, created_at')
			.eq('action', action)
			.order('created_at', { ascending: false })
			.limit(120)

		if (error) {
			throw new Error(`ops_audit_log select failed: ${error.message}`)
		}

		const row = data?.find((r) => payloadBookingId(r.payload) === bookingId)
		if (row && row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)) {
			return row.payload as Record<string, unknown>
		}

		if (Date.now() > deadline) {
			throw new Error(
				`Timeout waiting for ops_audit_log action=${action} with payload.booking_id=${bookingId}`,
			)
		}
		await new Promise((r) => setTimeout(r, intervalMs))
	}
}
