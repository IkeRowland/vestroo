'use server'

/**
 * **15C.4** template preview — **read-only**. Do **not** import `@/lib/email/send`, Resend, or SMS send paths here.
 */
import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { loadCommsTemplatePreviewSchema } from '@/lib/ops-comms-preview-schemas'
import { buildCommsPreviewVarMap } from '@/lib/comms/preview-seed'
import { sanitizeCommsPreviewHtml } from '@/lib/comms/preview-html'
import { estimateSmsPreviewSegments } from '@/lib/comms/preview-sms-segments'
import { substituteCommsTemplatePlaceholders } from '@/lib/comms/preview-substitute'
import { createUserServerClient } from '@/lib/supabase/server'
import type { CommsChannelDb } from '@/types/database.types'

export type CommsTemplatePreviewEmail = {
	channel: 'email'
	event_key: string
	subjectRendered: string | null
	htmlSanitized: string
	htmlWasEmpty: boolean
	bodyTextRendered: string | null
	bodyTextWasEmptyInDb: boolean
}

export type CommsTemplatePreviewSms = {
	channel: 'sms'
	event_key: string
	smsRendered: string
	smsWasEmptyInDb: boolean
	segmentInfo: ReturnType<typeof estimateSmsPreviewSegments>
}

export type CommsTemplatePreviewResult =
	| { ok: true; preview: CommsTemplatePreviewEmail | CommsTemplatePreviewSms }
	| { ok: false; error: { code: string; message: string; correlationId?: string } }

export async function loadCommsTemplatePreviewAction(
	raw: unknown,
): Promise<CommsTemplatePreviewResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = loadCommsTemplatePreviewSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'loadCommsTemplatePreviewAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		const fail = buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId)
		return { ok: false, error: fail.error }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'loadCommsTemplatePreviewAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		const fail = buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
		return { ok: false, error: fail.error }
	}

	const supabase = await createUserServerClient()
	const { id, event_key: eventKeyInput, channel: channelInput } = parsed.data

	const { data: row, error } = await supabase
		.from('comms_templates')
		.select(
			'id, event_key, channel, subject, body_html, body_text, sms_body, version, active, created_at, updated_at',
		)
		.eq('id', id)
		.maybeSingle()

	if (error) {
		logOpsAction({
			action: 'loadCommsTemplatePreviewAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error.message,
		})
		const fail = buildOpsActionFailure('DATABASE', error.message, correlationId)
		return { ok: false, error: fail.error }
	}

	if (!row) {
		const fail = buildOpsActionFailure('NOT_FOUND', 'Template not found', correlationId)
		return { ok: false, error: fail.error }
	}

	if (row.event_key !== eventKeyInput || row.channel !== channelInput) {
		const fail = buildOpsActionFailure(
			'MISMATCH',
			'Template id does not match the selected event or channel.',
			correlationId,
		)
		return { ok: false, error: fail.error }
	}

	const channel = row.channel as CommsChannelDb
	const vars = buildCommsPreviewVarMap(row.event_key as string)

	if (channel === 'email') {
		const subjectRendered =
			row.subject != null && row.subject.trim() !== ''
				? substituteCommsTemplatePlaceholders(row.subject, vars)
				: null
		const htmlRaw = row.body_html ?? ''
		const htmlWasEmpty = htmlRaw.trim() === ''
		const htmlSubstituted = substituteCommsTemplatePlaceholders(htmlRaw, vars)
		const htmlSanitized = htmlWasEmpty ? '' : sanitizeCommsPreviewHtml(htmlSubstituted)

		const textRaw = row.body_text
		const bodyTextWasEmptyInDb = textRaw == null || textRaw.trim() === ''
		const bodyTextRendered = bodyTextWasEmptyInDb
			? null
			: substituteCommsTemplatePlaceholders(textRaw, vars)

		logOpsAction({
			action: 'loadCommsTemplatePreviewAction',
			outcome: 'success',
			level: 'info',
			correlationId,
			meta: { channel: 'email', template_id: id },
		})

		return {
			ok: true,
			preview: {
				channel: 'email',
				event_key: row.event_key as string,
				subjectRendered,
				htmlSanitized,
				htmlWasEmpty,
				bodyTextRendered,
				bodyTextWasEmptyInDb,
			},
		}
	}

	const smsRaw = row.sms_body ?? ''
	const smsWasEmptyInDb = smsRaw.trim() === ''
	const smsRendered = substituteCommsTemplatePlaceholders(smsRaw, vars)
	const segmentInfo = estimateSmsPreviewSegments(smsRendered)

	logOpsAction({
		action: 'loadCommsTemplatePreviewAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		meta: { channel: 'sms', template_id: id },
	})

	return {
		ok: true,
		preview: {
			channel: 'sms',
			event_key: row.event_key as string,
			smsRendered,
			smsWasEmptyInDb,
			segmentInfo,
		},
	}
}
