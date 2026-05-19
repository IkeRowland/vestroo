import { randomBytes } from 'node:crypto'

import type { SupabaseClient } from '@supabase/supabase-js'

import { getOpsAutomationAuditActorId } from '@/lib/comms/automation-audit-actor'
import { QUOTE_LINK_SYSTEM_AUDIT_ACTOR_ID } from '@/lib/quote-reject-constants'

const QUOTE_LINK_AUDIT_EMAIL = 'quote-link-system@vestroo.internal'

function quoteLinkBootstrapPassword(): string {
	const core = randomBytes(28).toString('base64url')
	return `${core}Aa1!`
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms))
}

const quoteLinkProfilePayload = () => ({
	id: QUOTE_LINK_SYSTEM_AUDIT_ACTOR_ID,
	full_name: 'Quote link (system)',
	email: QUOTE_LINK_AUDIT_EMAIL,
	phone: '',
	role: 'customer' as const,
	status: 'active' as const,
})

/**
 * Writes **`public.profiles`** for the fixed quote-link audit user and returns the row **`id`**
 * from the same PostgREST round-trip (avoids read-your-writes / replica lag from a blind follow-up SELECT).
 */
async function writeQuoteLinkSystemProfileRow(
	supabase: SupabaseClient,
): Promise<{ ok: true; actorId: string } | { ok: false; message: string }> {
	const payload = quoteLinkProfilePayload()
	const id = payload.id

	const up = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('id').maybeSingle()

	if (!up.error && up.data?.id) {
		return { ok: true, actorId: up.data.id }
	}

	// Concurrent trigger may have inserted the row; plain insert then surfaces 23505.
	const ins = await supabase.from('profiles').insert(payload).select('id').maybeSingle()

	if (!ins.error && ins.data?.id) {
		return { ok: true, actorId: ins.data.id }
	}

	if (ins.error?.code === '23505' || /duplicate key/i.test(ins.error?.message ?? '')) {
		const sel = await supabase.from('profiles').select('id').eq('id', id).maybeSingle()
		if (!sel.error && sel.data?.id) {
			return { ok: true, actorId: sel.data.id }
		}
	}

	const msg = up.error?.message ?? ins.error?.message ?? 'profiles write returned no id'
	return { ok: false, message: msg }
}

/**
 * After **`auth.admin.createUser`**, `on_auth_user_created` may insert **`profiles`** in the same
 * transaction; wait briefly so we do not mis-read “missing” before the row is visible.
 */
async function waitForQuoteLinkProfileRow(
	supabase: SupabaseClient,
	maxAttempts = 12,
	intervalMs = 75,
): Promise<{ ok: true; actorId: string } | { ok: false }> {
	const id = QUOTE_LINK_SYSTEM_AUDIT_ACTOR_ID
	for (let i = 0; i < maxAttempts; i++) {
		const { data, error } = await supabase.from('profiles').select('id').eq('id', id).maybeSingle()
		if (!error && data?.id) {
			return { ok: true, actorId: data.id }
		}
		await sleep(intervalMs)
	}
	return { ok: false }
}

/**
 * Ensures **`auth.users`** + **`public.profiles`** exist for the Epic 14.4 fixed quote-link audit id,
 * using **`auth.admin`** (service-role client).
 */
async function ensureQuoteLinkSystemActorViaAuthAdmin(
	supabase: SupabaseClient,
): Promise<{ ok: true; actorId: string } | { ok: false; message: string }> {
	const id = QUOTE_LINK_SYSTEM_AUDIT_ACTOR_ID

	const { data: existingUser, error: getErr } = await supabase.auth.admin.getUserById(id)
	if (getErr && !/not found|no user|User not found/i.test(getErr.message)) {
		return { ok: false, message: getErr.message }
	}

	if (existingUser?.user?.id === id) {
		return writeQuoteLinkSystemProfileRow(supabase)
	}

	const { data: created, error: createErr } = await supabase.auth.admin.createUser({
		id,
		email: QUOTE_LINK_AUDIT_EMAIL,
		password: quoteLinkBootstrapPassword(),
		email_confirm: true,
		user_metadata: { full_name: 'Quote link (system)' },
	})

	if (!createErr && created?.user?.id === id) {
		const waited = await waitForQuoteLinkProfileRow(supabase)
		if (waited.ok) {
			return waited
		}
		return writeQuoteLinkSystemProfileRow(supabase)
	}

	const msg = createErr?.message ?? ''
	if (/already|registered|exists|duplicate/i.test(msg)) {
		const { data: again, error: againErr } = await supabase.auth.admin.getUserById(id)
		if (againErr && !/not found|no user|User not found/i.test(againErr.message)) {
			return { ok: false, message: againErr.message }
		}
		if (again?.user?.id === id) {
			return writeQuoteLinkSystemProfileRow(supabase)
		}
	}

	return {
		ok: false,
		message: createErr?.message ?? 'auth.admin.createUser failed for quote-link audit actor',
	}
}

/**
 * Resolves a **`profiles.id`** suitable for **`ops_audit_log.actor_id`** on public quote-link flows.
 * Provisions the Epic 14.4 system user via **`auth.admin`** when missing.
 * Falls back to **`OPS_AUTOMATION_AUDIT_ACTOR_ID`** when set and present in **`profiles`**.
 */
export async function resolveQuoteLinkOpsAuditActorId(
	supabase: SupabaseClient,
): Promise<{ ok: true; actorId: string } | { ok: false; message: string }> {
	const id = QUOTE_LINK_SYSTEM_AUDIT_ACTOR_ID

	const { data: existing, error: selErr } = await supabase.from('profiles').select('id').eq('id', id).maybeSingle()

	if (!selErr && existing?.id) {
		return { ok: true, actorId: existing.id }
	}

	const provisioned = await ensureQuoteLinkSystemActorViaAuthAdmin(supabase)
	if (provisioned.ok) {
		return { ok: true, actorId: provisioned.actorId }
	}

	const auto = getOpsAutomationAuditActorId()
	if (auto) {
		const { data: autoRow, error: autoErr } = await supabase.from('profiles').select('id').eq('id', auto).maybeSingle()
		if (!autoErr && autoRow?.id) {
			return { ok: true, actorId: autoRow.id }
		}
	}

	const parts = [provisioned.message, selErr?.message].filter(Boolean)
	return {
		ok: false,
		message:
			parts.join(' — ') ||
			'Could not resolve quote-link audit actor (auth.admin provisioning failed and OPS_AUTOMATION_AUDIT_ACTOR_ID unset or invalid).',
	}
}
