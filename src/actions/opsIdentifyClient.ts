'use server'

import { z } from 'zod'

import { buildAccountSnapshotFromRow } from '@/actions/client-type-resolution'
import type { AccountDomainCandidateRow } from '@/actions/client-type-resolution'
import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const searchQuerySchema = z.object({
	q: z.string().trim().min(1).max(120),
})

const createAccountSchema = z.object({
	name: z.string().trim().min(1).max(200),
	slug: z
		.string()
		.trim()
		.min(2)
		.max(80)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug: lowercase letters, numbers, hyphens only'),
})

const identifySchema = z.discriminatedUnion('intent', [
	z.object({
		bookingId: z.string().uuid(),
		intent: z.literal('link'),
		customerAccountId: z.string().uuid(),
	}),
	z.object({
		bookingId: z.string().uuid(),
		intent: z.literal('unlink'),
	}),
	z.object({
		bookingId: z.string().uuid(),
		intent: z.literal('create_and_link'),
		account: createAccountSchema,
	}),
])

function mergeBookingMetadataOpsManual(existing: unknown): Record<string, unknown> {
	const base =
		existing && typeof existing === 'object' && !Array.isArray(existing)
			? { ...(existing as Record<string, unknown>) }
			: {}
	base.client_type_source = 'ops_manual'
	return base
}

async function fetchAccountSnapshotRow(
	supabase: Awaited<ReturnType<typeof createServerClient>>,
	id: string,
): Promise<AccountDomainCandidateRow | null> {
	const { data, error } = await supabase
		.from('customer_accounts')
		.select('id, name, credit_terms_days, default_billing_entity_ref, default_po_required')
		.eq('id', id)
		.maybeSingle()
	if (error || !data) {
		return null
	}
	return data as AccountDomainCandidateRow
}

/**
 * Staff typeahead for linking a booking to an existing corporate account.
 */
export async function searchCustomerAccountsForOps(input: unknown) {
	const correlationId = newOpsCorrelationId()
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}
	const parsed = searchQuerySchema.safeParse(input)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid search', correlationId)
	}
	const supabase = await createServerClient()
	const raw = parsed.data.q
	const escaped = raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
	const pattern = `%${escaped}%`
	const { data, error } = await supabase
		.from('customer_accounts')
		.select('id, name, status')
		.ilike('name', pattern)
		.order('name', { ascending: true })
		.limit(30)

	if (error) {
		logOpsAction({
			action: 'searchCustomerAccountsForOps',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', 'Search failed', correlationId)
	}

	return {
		ok: true as const,
		accounts: (data ?? []).map((r) => ({
			id: r.id as string,
			name: r.name as string,
			status: r.status as string,
		})),
	}
}

/**
 * Story 12.6 — ops identify-client: link, create+link, or unlink (Q5: unpaid only).
 */
export async function identifyClientForBookingAction(input: unknown) {
	const correlationId = newOpsCorrelationId()
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'identifyClientForBookingAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const parsed = identifySchema.safeParse(input)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid request', correlationId)
	}

	const supabase = await createServerClient()
	const { bookingId, intent } = parsed.data

	const { data: booking, error: loadErr } = await supabase
		.from('bookings')
		.select('id, payment_status, client_type, customer_account_id, booking_metadata')
		.eq('id', bookingId)
		.maybeSingle()

	if (loadErr || !booking) {
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	const paymentStatus = booking.payment_status as string | null
	if (paymentStatus === 'paid') {
		return buildOpsActionFailure(
			'POLICY',
			'Paid bookings cannot change client linkage (finance reconciliation).',
			correlationId,
		)
	}

	const priorClientType = booking.client_type as string
	const priorAccountId = (booking.customer_account_id as string | null) ?? null
	const priorMetadata = booking.booking_metadata

	let targetAccountId: string | null = null
	let snapshotRow: AccountDomainCandidateRow | null = null

	if (intent === 'unlink') {
		if (priorClientType !== 'account_client' && priorAccountId == null) {
			return buildOpsActionFailure(
				'POLICY',
				'This booking is not linked to an account.',
				correlationId,
			)
		}
	} else if (intent === 'link') {
		targetAccountId = parsed.data.customerAccountId
		snapshotRow = await fetchAccountSnapshotRow(supabase, targetAccountId)
		if (!snapshotRow) {
			return buildOpsActionFailure('NOT_FOUND', 'Account not found', correlationId)
		}
	} else {
		const { account } = parsed.data
		const { data: created, error: insErr } = await supabase
			.from('customer_accounts')
			.insert({
				name: account.name,
				slug: account.slug,
				status: 'active',
				authorized_email_domains: [],
				created_by: gate.session.userId,
			})
			.select('id')
			.single()

		if (insErr || !created?.id) {
			logOpsAction({
				action: 'identifyClientForBookingAction',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'DATABASE',
				bookingId,
				hint: insErr?.message,
			})
			return buildOpsActionFailure(
				'DATABASE',
				insErr?.message?.includes('duplicate') || insErr?.message?.includes('unique')
					? 'An account with this slug already exists. Choose another slug.'
					: 'Could not create account.',
				correlationId,
			)
		}
		targetAccountId = created.id as string
		snapshotRow = await fetchAccountSnapshotRow(supabase, targetAccountId)
		if (!snapshotRow) {
			return buildOpsActionFailure('NOT_FOUND', 'Account not found after create', correlationId)
		}
	}

	const patch: Record<string, unknown> = {
		booking_metadata: mergeBookingMetadataOpsManual(priorMetadata),
	}

	if (intent === 'unlink') {
		patch.client_type = 'walk_in'
		patch.customer_account_id = null
		patch.account_snapshot = null
	} else {
		patch.client_type = 'account_client'
		patch.customer_account_id = targetAccountId
		patch.account_snapshot = buildAccountSnapshotFromRow(snapshotRow!)
	}

	const { error: upErr } = await supabase.from('bookings').update(patch).eq('id', bookingId)

	if (upErr) {
		logOpsAction({
			action: 'identifyClientForBookingAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint: upErr.message,
		})
		return buildOpsActionFailure('DATABASE', 'Update failed', correlationId)
	}

	const auditPayload: Record<string, unknown> = {
		prior_client_type: priorClientType,
		prior_customer_account_id: priorAccountId,
		new_customer_account_id: intent === 'unlink' ? null : targetAccountId,
		booking_id: bookingId,
		intent,
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		action: 'identify_client',
		entity: 'booking',
		entityId: bookingId,
		payload: auditPayload,
	})

	if (!audit.ok) {
		console.error('identifyClientForBookingAction: audit append failed', audit.message)
	}

	logOpsAction({
		action: 'identifyClientForBookingAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId,
		meta: { intent },
	})

	revalidatePath('/ops/bookings')

	return {
		ok: true as const,
		warning: audit.ok ? undefined : 'Booking updated; audit log could not be recorded.',
	}
}
