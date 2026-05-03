import type { SupabaseClient } from '@supabase/supabase-js'

import type { CommsChannel, CommsEventKey } from '@/types/comms'
import type { CommsDispatchRuleRowDb, CommsTemplateRowDb } from '@/types/database.types'

/** Service-role reads only (`comms_*` RLS is staff-only for JWT clients). */
export async function fetchActiveCommsDispatchRules(
	supabase: SupabaseClient,
	eventKey: CommsEventKey,
	channel: CommsChannel,
): Promise<CommsDispatchRuleRowDb[]> {
	const { data, error } = await supabase
		.from('comms_dispatch_rules')
		.select(
			'id, event_key, channel, recipient_role, recipient_filter, active, created_at, updated_at',
		)
		.eq('event_key', eventKey)
		.eq('channel', channel)
		.eq('active', true)

	if (error) {
		console.error('[vestroo:comms] fetchActiveCommsDispatchRules failed:', error.message)
		return []
	}
	return (data ?? []) as CommsDispatchRuleRowDb[]
}

/** At most one active row per (event_key, channel) per 15C.1 partial unique. */
export async function fetchActiveCommsTemplate(
	supabase: SupabaseClient,
	eventKey: CommsEventKey,
	channel: CommsChannel,
): Promise<CommsTemplateRowDb | null> {
	const { data, error } = await supabase
		.from('comms_templates')
		.select(
			'id, event_key, channel, subject, body_html, body_text, sms_body, version, active, created_at, updated_at',
		)
		.eq('event_key', eventKey)
		.eq('channel', channel)
		.eq('active', true)
		.maybeSingle()

	if (error) {
		console.error('[vestroo:comms] fetchActiveCommsTemplate failed:', error.message)
		return null
	}
	return (data as CommsTemplateRowDb | null) ?? null
}
