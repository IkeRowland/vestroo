import type { SupabaseClient } from '@supabase/supabase-js'

import {
	OPS_AUDIT_ACTION_COMMS_NO_ACTIVE_TEMPLATE,
	OPS_AUDIT_ACTION_COMMS_NO_RULE_MATCHED,
} from '@/lib/comms/audit-actions'
import { getOpsAutomationAuditActorId } from '@/lib/comms/automation-audit-actor'
import {
	fetchActiveCommsDispatchRules,
	fetchActiveCommsTemplate,
} from '@/lib/comms/matrix-queries'
import {
	getAccountPrefsDeepLinkCategory,
	getCommsEventCommsCategory,
} from '@/lib/comms/comms-event-category'
import {
	type CommsRecipientResolutionBooking,
	resolveCommsEmailRecipient,
} from '@/lib/comms/recipient-resolve'
import { buildAccountPreferencesAbsoluteUrl, isEmailPortalPreferenceLinkEligible } from '@/lib/email/account-preferences-url'
import { appendComplianceFooterToEmailHtml } from '@/lib/email/compliance-footer-html'
import { buildListUnsubscribeHeaderValue } from '@/lib/email/list-unsubscribe-headers'
import { sendEmail } from '@/lib/email/send'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import {
	COMMS_DISPATCH_RECIPIENT_ROLES,
	type CommsChannel,
	type CommsDispatchRecipientRole,
	type CommsEventKey,
} from '@/types/comms'
import type { CommsDispatchRuleRowDb, CommsTemplateRowDb } from '@/types/database.types'

const DEBUG_PAYLOAD = { log_level: 'debug' } as const

export type CommsMatrixEmailSnapshot = {
	rules: CommsDispatchRuleRowDb[]
	template: CommsTemplateRowDb
}

export type CommsMatrixEmailGate =
	| { ok: true; snapshot: CommsMatrixEmailSnapshot }
	| { ok: false; kind: 'no_rules' | 'no_template' }

function replaceBookingRefPlaceholders(input: string, bookingRef: string): string {
	return input.replace(/\{\{\s*booking_ref\s*\}\}/gi, bookingRef)
}

function escapeRegExpForTemplateKey(key: string): string {
	return key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyCommsTemplateVariableMap(
	input: string,
	bookingRef: string,
	extra: Record<string, string> | undefined,
): string {
	let out = replaceBookingRefPlaceholders(input, bookingRef)
	if (!extra) return out
	for (const [key, value] of Object.entries(extra)) {
		if (!/^[a-z0-9_]+$/i.test(key)) continue
		const re = new RegExp(`\\{\\{\\s*${escapeRegExpForTemplateKey(key)}\\s*\\}\\}`, 'gi')
		out = out.replace(re, value)
	}
	return out
}

function capIdempotencyKey(key: string): string {
	return key.length > 256 ? key.slice(0, 256) : key
}

function isKnownRecipientRole(r: string): r is (typeof COMMS_DISPATCH_RECIPIENT_ROLES)[number] {
	return (COMMS_DISPATCH_RECIPIENT_ROLES as readonly string[]).includes(r)
}

async function appendCommsMatrixAudit(input: {
	userSupabase: SupabaseClient
	serviceSupabase: SupabaseClient
	staffActorId?: string | null
	automationActorId?: string | null
	action: typeof OPS_AUDIT_ACTION_COMMS_NO_RULE_MATCHED | typeof OPS_AUDIT_ACTION_COMMS_NO_ACTIVE_TEMPLATE
	entity: string
	entityId: string | null
	payload: Record<string, unknown>
}): Promise<void> {
	const basePayload = { ...input.payload, ...DEBUG_PAYLOAD }
	if (input.staffActorId) {
		const r = await appendOpsAuditLog(input.userSupabase, {
			actorId: input.staffActorId,
			actorRole: 'dispatcher',
			action: input.action,
			entity: input.entity,
			entityId: input.entityId,
			payload: basePayload,
		})
		if (!r.ok) {
			console.error('[vestroo:comms] appendCommsMatrixAudit (staff) failed:', r.message)
		}
		return
	}
	const actor = input.automationActorId ?? getOpsAutomationAuditActorId()
	if (!actor) {
		console.warn(
			'[vestroo:comms] appendCommsMatrixAudit skipped: set OPS_AUTOMATION_AUDIT_ACTOR_ID for automated comms audits',
		)
		return
	}
	const r = await appendOpsAuditLog(input.serviceSupabase, {
		actorId: actor,
		actorRole: 'dispatcher',
		action: input.action,
		entity: input.entity,
		entityId: input.entityId,
		payload: basePayload,
	})
	if (!r.ok) {
		console.error('[vestroo:comms] appendCommsMatrixAudit (service) failed:', r.message)
	}
}

/**
 * Loads active rules + active template for an email send. Call **before** mutating quote/booking
 * when a configured matrix is required for first-time customer email (**15C.2**).
 */
export async function loadCommsEmailMatrixGate(
	serviceSupabase: SupabaseClient,
	eventKey: CommsEventKey,
	channel: CommsChannel,
): Promise<CommsMatrixEmailGate> {
	if (channel !== 'email') {
		return { ok: false, kind: 'no_rules' }
	}
	const rules = await fetchActiveCommsDispatchRules(serviceSupabase, eventKey, channel)
	if (rules.length === 0) {
		return { ok: false, kind: 'no_rules' }
	}
	const template = await fetchActiveCommsTemplate(serviceSupabase, eventKey, channel)
	if (!template) {
		return { ok: false, kind: 'no_template' }
	}
	return { ok: true, snapshot: { rules, template } }
}

export type SendCommsMatrixEmailDispatchesInput = {
	serviceSupabase: SupabaseClient
	userSupabase: SupabaseClient
	staffActorId?: string | null
	automationActorId?: string | null
	eventKey: CommsEventKey
	channel: CommsChannel
	entity: string
	entityId: string | null
	correlationId?: string
	bookingId: string
	quoteId?: string | null
	booking: CommsRecipientResolutionBooking
	bookingRefLabel: string
	/** Optional `{{name}}` replacements beyond `booking_ref` (e.g. **15C.7** `booking_id`, `due_date`, `amount`). */
	templateVariableMap?: Record<string, string>
	/**
	 * Epic 16 / **16.16** — appended after template/fallback merge, **before** compliance footer.
	 * Used for account invoice EFT blocks (service-role bank JSON); keep server-only assembly.
	 */
	appendBeforeComplianceFooterHtml?: string
	snapshot: CommsMatrixEmailSnapshot
	getFallbackEmail: () => Promise<{ subject: string; html: string }>
	baseIdempotencyKey: string
}

export type SendCommsMatrixEmailDispatchesResult =
	| { outcome: 'sent'; sendCount: number; lastMessageId?: string }
	| { outcome: 'failed'; message: string }
	| { outcome: 'no_recipients' }

/**
 * Sends one email per active dispatch rule (email channel). Caller must have passed `loadCommsEmailMatrixGate`.
 */
export async function sendCommsMatrixEmailDispatches(
	input: SendCommsMatrixEmailDispatchesInput,
): Promise<SendCommsMatrixEmailDispatchesResult> {
	if (input.channel !== 'email') {
		return { outcome: 'no_recipients' }
	}

	const { template, rules } = input.snapshot
	const fallback = await input.getFallbackEmail()
	const subjectFromDb = template.subject?.trim() ?? ''
	const htmlFromDb = template.body_html?.trim() ?? ''

	const subjectBase =
		subjectFromDb !== ''
			? applyCommsTemplateVariableMap(subjectFromDb, input.bookingRefLabel, input.templateVariableMap)
			: applyCommsTemplateVariableMap(fallback.subject, input.bookingRefLabel, input.templateVariableMap)
	const htmlMerged =
		htmlFromDb !== ''
			? applyCommsTemplateVariableMap(htmlFromDb, input.bookingRefLabel, input.templateVariableMap)
			: applyCommsTemplateVariableMap(fallback.html, input.bookingRefLabel, input.templateVariableMap)

	const htmlBase =
		htmlMerged + (typeof input.appendBeforeComplianceFooterHtml === 'string' ?
			input.appendBeforeComplianceFooterHtml
		:	'')

	const commsCategory = getCommsEventCommsCategory(input.eventKey)
	const deepLinkCategory = getAccountPrefsDeepLinkCategory(input.eventKey)

	let sendCount = 0
	let lastMessageId: string | undefined

	for (const rule of rules) {
		const rr = rule.recipient_role as string
		if (!isKnownRecipientRole(rr)) continue
		const role = rr as CommsDispatchRecipientRole

		const toRes = await resolveCommsEmailRecipient(
			input.userSupabase,
			role,
			(rule.recipient_filter ?? {}) as Record<string, unknown>,
			input.booking,
		)
		if (!toRes.ok) continue

		const portalPreferenceLinks =
			deepLinkCategory !== null && isEmailPortalPreferenceLinkEligible(role, input.booking)
		const managePrefsUrl =
			portalPreferenceLinks && deepLinkCategory ? buildAccountPreferencesAbsoluteUrl(deepLinkCategory) : null

		const htmlForSend = appendComplianceFooterToEmailHtml(htmlBase, {
			category: commsCategory,
			portalPreferenceLinks,
			prefsLinkCategory: deepLinkCategory,
			buildAccountPreferencesUrl: buildAccountPreferencesAbsoluteUrl,
		})

		const listUnsubHeaders = buildListUnsubscribeHeaderValue({
			category: commsCategory,
			portalPreferenceLinks,
			managePrefsAbsoluteUrl: managePrefsUrl,
		})

		const idem = capIdempotencyKey(`${input.baseIdempotencyKey}:${rule.id}`)
		const sendRes = await sendEmail({
			to: toRes.email,
			subject: subjectBase,
			html: htmlForSend,
			headers: Object.keys(listUnsubHeaders).length > 0 ? listUnsubHeaders : undefined,
			idempotencyKey: idem,
		})

		if (!sendRes.ok) {
			return { outcome: 'failed', message: sendRes.error.message }
		}
		sendCount += 1
		if (sendRes.ok && sendRes.mode === 'sent' && sendRes.messageId) {
			lastMessageId = sendRes.messageId
		}
	}

	if (sendCount === 0) {
		await appendCommsMatrixAudit({
			userSupabase: input.userSupabase,
			serviceSupabase: input.serviceSupabase,
			staffActorId: input.staffActorId ?? undefined,
			automationActorId: input.automationActorId ?? undefined,
			action: OPS_AUDIT_ACTION_COMMS_NO_RULE_MATCHED,
			entity: input.entity,
			entityId: input.entityId,
			payload: {
				event_key: input.eventKey,
				channel: input.channel,
				booking_id: input.bookingId,
				variant: 'no_resolvable_email_recipients',
				...(input.quoteId ? { quote_id: input.quoteId } : {}),
				...(input.correlationId ? { correlation_id: input.correlationId } : {}),
			},
		})
		return { outcome: 'no_recipients' }
	}

	return { outcome: 'sent', sendCount, lastMessageId }
}

export async function auditCommsMatrixPreSendBlocked(input: {
	userSupabase: SupabaseClient
	serviceSupabase: SupabaseClient
	staffActorId?: string | null
	automationActorId?: string | null
	kind: 'no_rules' | 'no_template'
	entity: string
	entityId: string | null
	eventKey: CommsEventKey
	channel: CommsChannel
	bookingId: string
	quoteId?: string | null
	correlationId?: string
}): Promise<void> {
	const action =
		input.kind === 'no_rules'
			? OPS_AUDIT_ACTION_COMMS_NO_RULE_MATCHED
			: OPS_AUDIT_ACTION_COMMS_NO_ACTIVE_TEMPLATE
	await appendCommsMatrixAudit({
		userSupabase: input.userSupabase,
		serviceSupabase: input.serviceSupabase,
		staffActorId: input.staffActorId ?? undefined,
		automationActorId: input.automationActorId ?? undefined,
		action,
		entity: input.entity,
		entityId: input.entityId,
		payload: {
			event_key: input.eventKey,
			channel: input.channel,
			booking_id: input.bookingId,
			...(input.quoteId ? { quote_id: input.quoteId } : {}),
			...(input.correlationId ? { correlation_id: input.correlationId } : {}),
		},
	})
}
