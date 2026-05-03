'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { createUserServerClient } from '@/lib/supabase/server'
import type { ProfileRole } from '@/types/database.types'

const alertIdSchema = z.object({ id: z.string().uuid() })

function staffActorRole(role: ProfileRole): 'admin' | 'dispatcher' {
	return role === 'admin' ? 'admin' : 'dispatcher'
}

export async function acknowledgeOpsAlertAction(
	raw: z.infer<typeof alertIdSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = alertIdSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'acknowledgeOpsAlertAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'acknowledgeOpsAlertAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}
	const staff = gate.session
	const supabase = await createUserServerClient()

	const { error } = await supabase
		.from('ops_alerts')
		.update({
			acknowledged_at: new Date().toISOString(),
			acknowledged_by: staff.userId,
		})
		.eq('id', parsed.data.id)
		.is('acknowledged_at', null)
		.is('dismissed_at', null)

	if (error) {
		logOpsAction({
			action: 'acknowledgeOpsAlertAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: 'acknowledge_ops_alert',
		entity: 'ops_alert',
		entityId: parsed.data.id,
	})

	revalidatePath('/ops')

	logOpsAction({
		action: 'acknowledgeOpsAlertAction',
		outcome: 'success',
		level: 'info',
		correlationId,
	})
	return { ok: true as const }
}

export async function dismissOpsAlertAction(raw: z.infer<typeof alertIdSchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = alertIdSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'dismissOpsAlertAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'dismissOpsAlertAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}
	const staff = gate.session
	if (staff.role !== 'admin') {
		logOpsAction({
			action: 'dismissOpsAlertAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
		})
		return buildOpsActionFailure('FORBIDDEN', 'Admin only', correlationId)
	}

	const supabase = await createUserServerClient()
	const { error } = await supabase
		.from('ops_alerts')
		.update({
			dismissed_at: new Date().toISOString(),
			dismissed_by: staff.userId,
		})
		.eq('id', parsed.data.id)
		.is('dismissed_at', null)

	if (error) {
		logOpsAction({
			action: 'dismissOpsAlertAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: 'dismiss_ops_alert',
		entity: 'ops_alert',
		entityId: parsed.data.id,
	})

	revalidatePath('/ops')

	logOpsAction({
		action: 'dismissOpsAlertAction',
		outcome: 'success',
		level: 'info',
		correlationId,
	})
	return { ok: true as const }
}
