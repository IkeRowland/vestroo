import { randomUUID } from 'crypto'

export type OpsActionLogOutcome =
	| 'success'
	| 'failure'
	| 'validation_error'
	| 'forbidden'
	| 'not_found'
	| 'conflict'

export type OpsActionLogLevel = 'info' | 'warn' | 'error'

export type OpsActionLogEntry = {
	action: string
	outcome: OpsActionLogOutcome
	level: OpsActionLogLevel
	correlationId: string
	/** Optional short entity ids (UUIDs) — never log full PII payloads */
	entityId?: string
	bookingId?: string
	tripId?: string
	engagementId?: string
	/** High-level error code for failures */
	code?: string
	/** Redacted internal hint for operators (never raw Postgres text in production-facing sinks) */
	hint?: string
	/** Scalar meta only — no names, phones, emails, free-text notes */
	meta?: Record<string, string | number | boolean | null>
}

/** Generate a correlation id for one server-action invocation (safe to show in UI). */
export function newOpsCorrelationId(): string {
	return randomUUID()
}

function redactMeta(meta: OpsActionLogEntry['meta']): OpsActionLogEntry['meta'] {
	if (!meta) return undefined
	const out: Record<string, string | number | boolean | null> = {}
	for (const [k, v] of Object.entries(meta)) {
		if (typeof v === 'string' && v.length > 120) {
			out[k] = `[redacted len=${v.length}]`
			continue
		}
		out[k] = v
	}
	return out
}

/**
 * Emit one structured JSON line for ops server actions. Avoid logging full PII or env secrets.
 */
export function logOpsAction(entry: OpsActionLogEntry): void {
	const line = {
		scope: 'ops_action',
		ts: new Date().toISOString(),
		action: entry.action,
		outcome: entry.outcome,
		level: entry.level,
		correlationId: entry.correlationId,
		...(entry.entityId ? { entityId: entry.entityId } : {}),
		...(entry.bookingId ? { bookingId: entry.bookingId } : {}),
		...(entry.tripId ? { tripId: entry.tripId } : {}),
		...(entry.engagementId ? { engagementId: entry.engagementId } : {}),
		...(entry.code ? { code: entry.code } : {}),
		...(entry.hint ? { hint: entry.hint } : {}),
		...(entry.meta ? { meta: redactMeta(entry.meta) } : {}),
	}
	// Intentional structured ops logging (see docs/ops-server-action-logging.md).
	console.log(JSON.stringify(line))
}
