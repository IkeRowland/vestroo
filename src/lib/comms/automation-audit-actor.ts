/**
 * Epic 15 / **15C.2** — `ops_audit_log.actor_id` for service-role automation (matrix skips,
 * background dispatch jobs).
 * Must reference an existing `public.profiles.id` (e.g. a dedicated system staff profile in each env).
 */
export function getOpsAutomationAuditActorId(): string | null {
	const raw = process.env.OPS_AUTOMATION_AUDIT_ACTOR_ID?.trim()
	if (!raw) return null
	const uuidRe =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
	return uuidRe.test(raw) ? raw : null
}
