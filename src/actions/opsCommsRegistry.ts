'use server'

import { revalidatePath } from 'next/cache'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import {
	OPS_AUDIT_ACTION_COMMS_DISPATCH_RULE_UPDATED,
	OPS_AUDIT_ACTION_COMMS_TEMPLATE_UPDATED,
} from '@/lib/comms/audit-actions'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import {
	setCommsDispatchRuleActiveSchema,
	setCommsDispatchRuleRecipientFilterSchema,
	setCommsDispatchRuleRecipientRoleSchema,
	setCommsTemplateActiveSchema,
} from '@/lib/ops-comms-registry-schemas'
import { parseCommsRecipientFilterJson } from '@/lib/ops-comms-registry-validate'
import { createUserServerClient } from '@/lib/supabase/server'
import type {
	CommsDispatchRuleRowDb,
	CommsTemplateRowDb,
	ProfileRole,
} from '@/types/database.types'

function staffActorRole(role: ProfileRole): 'admin' | 'dispatcher' {
	return role === 'admin' ? 'admin' : 'dispatcher'
}

function asRecord(value: unknown): Record<string, unknown> {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>
	}
	return {}
}

function snapshotDispatchRule(row: CommsDispatchRuleRowDb): Record<string, unknown> {
	return {
		id: row.id,
		event_key: row.event_key,
		channel: row.channel,
		recipient_role: row.recipient_role,
		recipient_filter: row.recipient_filter,
		active: row.active,
		created_at: row.created_at,
		updated_at: row.updated_at,
	}
}

function snapshotTemplateMeta(row: {
	id: string
	event_key: string
	channel: string
	subject: string | null
	active: boolean
	version: number
	created_at: string
	updated_at: string
}): Record<string, unknown> {
	return {
		id: row.id,
		event_key: row.event_key,
		channel: row.channel,
		subject: row.subject,
		active: row.active,
		version: row.version,
		created_at: row.created_at,
		updated_at: row.updated_at,
	}
}

export type OpsCommsRegistryLoadSuccess = {
	ok: true
	rules: CommsDispatchRuleRowDb[]
	templates: Pick<
		CommsTemplateRowDb,
		'id' | 'event_key' | 'channel' | 'subject' | 'active' | 'version' | 'created_at' | 'updated_at'
	>[]
}

export type OpsCommsRegistryLoadFailure = {
	ok: false
	error: {
		code: string
		message: string
		correlationId?: string
	}
	rules: []
	templates: []
}

export type OpsCommsRegistryLoadResult =
	| OpsCommsRegistryLoadSuccess
	| OpsCommsRegistryLoadFailure

export async function loadOpsCommsRegistryAction(): Promise<OpsCommsRegistryLoadResult> {
	const correlationId = newOpsCorrelationId()
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'loadOpsCommsRegistryAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		const fail = buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
		return {
			ok: false as const,
			error: fail.error,
			rules: [],
			templates: [],
		}
	}

	const supabase = await createUserServerClient()
	const [rulesRes, templatesRes] = await Promise.all([
		supabase
			.from('comms_dispatch_rules')
			.select(
				'id, event_key, channel, recipient_role, recipient_filter, active, created_at, updated_at',
			)
			.order('event_key', { ascending: true })
			.order('channel', { ascending: true }),
		supabase
			.from('comms_templates')
			.select(
				'id, event_key, channel, subject, active, version, created_at, updated_at',
			)
			.order('event_key', { ascending: true })
			.order('channel', { ascending: true }),
	])

	if (rulesRes.error) {
		logOpsAction({
			action: 'loadOpsCommsRegistryAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: rulesRes.error.message,
		})
		const fail = buildOpsActionFailure('DATABASE', rulesRes.error.message, correlationId)
		return {
			ok: false as const,
			error: fail.error,
			rules: [],
			templates: [],
		}
	}
	if (templatesRes.error) {
		logOpsAction({
			action: 'loadOpsCommsRegistryAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: templatesRes.error.message,
		})
		const fail = buildOpsActionFailure('DATABASE', templatesRes.error.message, correlationId)
		return {
			ok: false as const,
			error: fail.error,
			rules: [],
			templates: [],
		}
	}

	const rules: CommsDispatchRuleRowDb[] = (rulesRes.data ?? []).map((r) => ({
		...r,
		recipient_role: r.recipient_role as string,
		recipient_filter: asRecord(r.recipient_filter),
	})) as CommsDispatchRuleRowDb[]

	const templates = (templatesRes.data ?? []) as OpsCommsRegistryLoadSuccess['templates']

	logOpsAction({
		action: 'loadOpsCommsRegistryAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		meta: {
			rule_count: rules.length,
			template_count: templates.length,
		},
	})

	return { ok: true, rules, templates }
}

type MutationOk = { ok: true }
type MutationFail = {
	ok: false
	error: { code: string; message: string; correlationId: string }
}

export async function setCommsDispatchRuleActiveAction(
	raw: unknown,
): Promise<MutationOk | MutationFail> {
	const correlationId = newOpsCorrelationId()
	const parsed = setCommsDispatchRuleActiveSchema.safeParse(raw)
	if (!parsed.success) {
		return {
			ok: false,
			error: {
				code: 'VALIDATION',
				message: 'Invalid payload',
				correlationId,
			},
		}
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return {
			ok: false,
			error: { code: 'FORBIDDEN', message: gate.message, correlationId },
		}
	}
	const staff = gate.session
	const supabase = await createUserServerClient()
	const { id, active } = parsed.data

	const { data: beforeRow, error: loadErr } = await supabase
		.from('comms_dispatch_rules')
		.select(
			'id, event_key, channel, recipient_role, recipient_filter, active, created_at, updated_at',
		)
		.eq('id', id)
		.maybeSingle()

	if (loadErr || !beforeRow) {
		return {
			ok: false,
			error: {
				code: 'NOT_FOUND',
				message: 'Dispatch rule not found',
				correlationId,
			},
		}
	}

	const before: CommsDispatchRuleRowDb = {
		...beforeRow,
		recipient_filter: asRecord(beforeRow.recipient_filter),
	} as CommsDispatchRuleRowDb

	if (before.active === active) {
		return { ok: true }
	}

	const { error: upErr } = await supabase
		.from('comms_dispatch_rules')
		.update({ active })
		.eq('id', id)

	if (upErr) {
		return {
			ok: false,
			error: {
				code: 'DATABASE',
				message: upErr.message,
				correlationId,
			},
		}
	}

	const { data: afterRow } = await supabase
		.from('comms_dispatch_rules')
		.select(
			'id, event_key, channel, recipient_role, recipient_filter, active, created_at, updated_at',
		)
		.eq('id', id)
		.single()

	const after: CommsDispatchRuleRowDb | null = afterRow
		? ({
				...afterRow,
				recipient_filter: asRecord(afterRow.recipient_filter),
			} as CommsDispatchRuleRowDb)
		: null

	const audit = await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: OPS_AUDIT_ACTION_COMMS_DISPATCH_RULE_UPDATED,
		entity: 'comms_dispatch_rule',
		entityId: id,
		payload: {
			before: snapshotDispatchRule(before),
			after: after ? snapshotDispatchRule(after) : { active },
		},
	})
	if (!audit.ok) {
		console.error('[vestroo:ops] appendOpsAuditLog comms_dispatch_rule active failed:', audit.message)
	}

	revalidatePath('/ops/bookings/comms-retry')
	return { ok: true }
}

export async function setCommsDispatchRuleRecipientRoleAction(
	raw: unknown,
): Promise<MutationOk | MutationFail> {
	const correlationId = newOpsCorrelationId()
	const parsed = setCommsDispatchRuleRecipientRoleSchema.safeParse(raw)
	if (!parsed.success) {
		return {
			ok: false,
			error: {
				code: 'VALIDATION',
				message: 'Invalid payload',
				correlationId,
			},
		}
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return {
			ok: false,
			error: { code: 'FORBIDDEN', message: gate.message, correlationId },
		}
	}
	const staff = gate.session
	const supabase = await createUserServerClient()
	const { id, recipient_role } = parsed.data

	const { data: beforeRow, error: loadErr } = await supabase
		.from('comms_dispatch_rules')
		.select(
			'id, event_key, channel, recipient_role, recipient_filter, active, created_at, updated_at',
		)
		.eq('id', id)
		.maybeSingle()

	if (loadErr || !beforeRow) {
		return {
			ok: false,
			error: {
				code: 'NOT_FOUND',
				message: 'Dispatch rule not found',
				correlationId,
			},
		}
	}

	const before: CommsDispatchRuleRowDb = {
		...beforeRow,
		recipient_filter: asRecord(beforeRow.recipient_filter),
	} as CommsDispatchRuleRowDb

	if (before.recipient_role === recipient_role) {
		return { ok: true }
	}

	const { error: upErr } = await supabase
		.from('comms_dispatch_rules')
		.update({ recipient_role })
		.eq('id', id)

	if (upErr) {
		return {
			ok: false,
			error: {
				code: 'DATABASE',
				message: upErr.message,
				correlationId,
			},
		}
	}

	const { data: afterRow } = await supabase
		.from('comms_dispatch_rules')
		.select(
			'id, event_key, channel, recipient_role, recipient_filter, active, created_at, updated_at',
		)
		.eq('id', id)
		.single()

	const after: CommsDispatchRuleRowDb | null = afterRow
		? ({
				...afterRow,
				recipient_filter: asRecord(afterRow.recipient_filter),
			} as CommsDispatchRuleRowDb)
		: null

	const audit = await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: OPS_AUDIT_ACTION_COMMS_DISPATCH_RULE_UPDATED,
		entity: 'comms_dispatch_rule',
		entityId: id,
		payload: {
			before: snapshotDispatchRule(before),
			after: after ? snapshotDispatchRule(after) : { recipient_role },
		},
	})
	if (!audit.ok) {
		console.error(
			'[vestroo:ops] appendOpsAuditLog comms_dispatch_rule recipient_role failed:',
			audit.message,
		)
	}

	revalidatePath('/ops/bookings/comms-retry')
	return { ok: true }
}

export async function setCommsDispatchRuleRecipientFilterAction(
	raw: unknown,
): Promise<MutationOk | MutationFail> {
	const correlationId = newOpsCorrelationId()
	const parsed = setCommsDispatchRuleRecipientFilterSchema.safeParse(raw)
	if (!parsed.success) {
		return {
			ok: false,
			error: {
				code: 'VALIDATION',
				message: 'Invalid payload',
				correlationId,
			},
		}
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return {
			ok: false,
			error: { code: 'FORBIDDEN', message: gate.message, correlationId },
		}
	}
	const staff = gate.session
	const supabase = await createUserServerClient()
	const { id, recipient_filter_json } = parsed.data

	const filterParsed = parseCommsRecipientFilterJson(recipient_filter_json)
	if (!filterParsed.ok) {
		return {
			ok: false,
			error: {
				code: 'VALIDATION',
				message: filterParsed.message,
				correlationId,
			},
		}
	}

	const { data: beforeRow, error: loadErr } = await supabase
		.from('comms_dispatch_rules')
		.select(
			'id, event_key, channel, recipient_role, recipient_filter, active, created_at, updated_at',
		)
		.eq('id', id)
		.maybeSingle()

	if (loadErr || !beforeRow) {
		return {
			ok: false,
			error: {
				code: 'NOT_FOUND',
				message: 'Dispatch rule not found',
				correlationId,
			},
		}
	}

	const before: CommsDispatchRuleRowDb = {
		...beforeRow,
		recipient_filter: asRecord(beforeRow.recipient_filter),
	} as CommsDispatchRuleRowDb

	const { error: upErr } = await supabase
		.from('comms_dispatch_rules')
		.update({ recipient_filter: filterParsed.value })
		.eq('id', id)

	if (upErr) {
		return {
			ok: false,
			error: {
				code: 'DATABASE',
				message: upErr.message,
				correlationId,
			},
		}
	}

	const { data: afterRow } = await supabase
		.from('comms_dispatch_rules')
		.select(
			'id, event_key, channel, recipient_role, recipient_filter, active, created_at, updated_at',
		)
		.eq('id', id)
		.single()

	const after: CommsDispatchRuleRowDb | null = afterRow
		? ({
				...afterRow,
				recipient_filter: asRecord(afterRow.recipient_filter),
			} as CommsDispatchRuleRowDb)
		: null

	const audit = await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: OPS_AUDIT_ACTION_COMMS_DISPATCH_RULE_UPDATED,
		entity: 'comms_dispatch_rule',
		entityId: id,
		payload: {
			before: snapshotDispatchRule(before),
			after: after ? snapshotDispatchRule(after) : { recipient_filter: filterParsed.value },
		},
	})
	if (!audit.ok) {
		console.error(
			'[vestroo:ops] appendOpsAuditLog comms_dispatch_rule recipient_filter failed:',
			audit.message,
		)
	}

	revalidatePath('/ops/bookings/comms-retry')
	return { ok: true }
}

export async function setCommsTemplateActiveAction(
	raw: unknown,
): Promise<MutationOk | MutationFail> {
	const correlationId = newOpsCorrelationId()
	const parsed = setCommsTemplateActiveSchema.safeParse(raw)
	if (!parsed.success) {
		return {
			ok: false,
			error: {
				code: 'VALIDATION',
				message: 'Invalid payload',
				correlationId,
			},
		}
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return {
			ok: false,
			error: { code: 'FORBIDDEN', message: gate.message, correlationId },
		}
	}
	const staff = gate.session
	const supabase = await createUserServerClient()
	const { id, active } = parsed.data

	const { data: beforeRow, error: loadErr } = await supabase
		.from('comms_templates')
		.select(
			'id, event_key, channel, subject, active, version, created_at, updated_at',
		)
		.eq('id', id)
		.maybeSingle()

	if (loadErr || !beforeRow) {
		return {
			ok: false,
			error: {
				code: 'NOT_FOUND',
				message: 'Template not found',
				correlationId,
			},
		}
	}

	if (beforeRow.active === active) {
		return { ok: true }
	}

	const { error: upErr } = await supabase
		.from('comms_templates')
		.update({ active })
		.eq('id', id)

	if (upErr) {
		return {
			ok: false,
			error: {
				code: 'DATABASE',
				message: upErr.message,
				correlationId,
			},
		}
	}

	const { data: afterRow } = await supabase
		.from('comms_templates')
		.select(
			'id, event_key, channel, subject, active, version, created_at, updated_at',
		)
		.eq('id', id)
		.single()

	const audit = await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: OPS_AUDIT_ACTION_COMMS_TEMPLATE_UPDATED,
		entity: 'comms_template',
		entityId: id,
		payload: {
			before: snapshotTemplateMeta(beforeRow),
			after: afterRow
				? snapshotTemplateMeta(afterRow)
				: { active },
		},
	})
	if (!audit.ok) {
		console.error('[vestroo:ops] appendOpsAuditLog comms_template active failed:', audit.message)
	}

	revalidatePath('/ops/bookings/comms-retry')
	return { ok: true }
}
