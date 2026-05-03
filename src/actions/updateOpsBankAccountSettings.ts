'use server'

import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { getOpsAdminForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { createUserServerClient } from '@/lib/supabase/server'

const BANK_ACCOUNT_KEY = 'bank_account' as const

const bankAccountSettingsFormSchema = z.object({
	bank_name: z.string().trim().min(1).max(200),
	account_holder: z.string().trim().min(1).max(200),
	account_number: z.string().trim().min(1).max(64),
	branch_code: z.string().trim().min(1).max(32),
	reference_format: z
		.string()
		.trim()
		.max(500)
		.optional()
		.transform((s) => (s && s.length > 0 ? s : 'VST-{booking_ref}')),
	invoice_reference_format: z
		.string()
		.trim()
		.max(500)
		.optional()
		.transform((s) => (s && s.length > 0 ? s : '')),
})

export type UpdateOpsBankAccountSettingsInput = z.infer<typeof bankAccountSettingsFormSchema>

export type UpdateOpsBankAccountSettingsResult =
	| { ok: true; correlationId: string }
	| ReturnType<typeof buildOpsActionFailure>

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Admin-only: updates **`ops_settings`** row **`key = bank_account`** (walk-in quotes, invoice EFT).
 */
export async function updateOpsBankAccountSettingsAction(
	raw: unknown,
): Promise<UpdateOpsBankAccountSettingsResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = bankAccountSettingsFormSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'updateOpsBankAccountSettings',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Check all required fields.', correlationId)
	}

	const gate = await getOpsAdminForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'updateOpsBankAccountSettings',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const { data: row, error: loadErr } = await supabase
		.from('ops_settings')
		.select('value')
		.eq('key', BANK_ACCOUNT_KEY)
		.maybeSingle()

	if (loadErr) {
		return buildOpsActionFailure('DATABASE', loadErr.message, correlationId)
	}

	const prev = row?.value && isPlainObject(row.value) ? (row.value as Record<string, unknown>) : {}
	const nextValue: Record<string, unknown> = {
		...prev,
		bank_name: parsed.data.bank_name,
		account_holder: parsed.data.account_holder,
		account_number: parsed.data.account_number,
		branch_code: parsed.data.branch_code,
		reference_format: parsed.data.reference_format,
	}
	if (parsed.data.invoice_reference_format.length > 0) {
		nextValue.invoice_reference_format = parsed.data.invoice_reference_format
	} else {
		delete nextValue.invoice_reference_format
	}

	const { error: updErr } = await supabase
		.from('ops_settings')
		.update({
			value: nextValue,
			updated_at: new Date().toISOString(),
			updated_by: gate.session.userId,
		})
		.eq('key', BANK_ACCOUNT_KEY)

	if (updErr) {
		logOpsAction({
			action: 'updateOpsBankAccountSettings',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: updErr.message,
		})
		return buildOpsActionFailure('DATABASE', updErr.message, correlationId)
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		actorRole: 'admin',
		action: 'ops_bank_account_settings_updated',
		entity: 'ops_settings',
		entityId: null,
		payload: { key: BANK_ACCOUNT_KEY },
	})
	if (!audit.ok) {
		console.error('[vestroo:ops] appendOpsAuditLog ops_bank_account_settings_updated failed:', audit.message)
	}

	logOpsAction({
		action: 'updateOpsBankAccountSettings',
		outcome: 'success',
		level: 'info',
		correlationId,
	})

	return { ok: true, correlationId }
}
