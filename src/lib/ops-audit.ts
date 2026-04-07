import type { SupabaseClient } from '@supabase/supabase-js'

import type { OpsAuditActorRoleDb } from '@/types/database.types'

export type OpsAuditInsert = {
	actorId: string
	/** When omitted, DB default `dispatcher` applies (staff policies expect dispatcher/admin). */
	actorRole?: OpsAuditActorRoleDb
	action: string
	entity: string
	entityId?: string | null
	payload?: Record<string, unknown>
}

export async function appendOpsAuditLog(
	supabase: SupabaseClient,
	row: OpsAuditInsert,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const { error } = await supabase.from('ops_audit_log').insert({
		actor_id: row.actorId,
		...(row.actorRole !== undefined ? { actor_role: row.actorRole } : {}),
		action: row.action,
		entity: row.entity,
		entity_id: row.entityId ?? null,
		payload: row.payload ?? {},
	})
	if (error) {
		return { ok: false, message: error.message }
	}
	return { ok: true }
}
