import type { SupabaseClient } from '@supabase/supabase-js'

import type {
	AccountSnapshotJsonDb,
	CanDispatchAccountBookingReasonDb,
} from '@/types/database.types'

/**
 * Stable substring used in `accountRequiresPurchaseOrderMessage` and server-side
 * `assertPurchaseOrderForAccountBookingInsert` — match submit errors without duplicating full literals.
 */
export const ACCOUNT_REQUIRES_PURCHASE_ORDER_MESSAGE_MARKER =
	'requires a purchase order reference for every booking.'

/** User-facing copy when an account requires `purchase_order_ref` (Epic 12 Q4 / US-E1). */
export function accountRequiresPurchaseOrderMessage(accountDisplayName: string): string {
	return `${accountDisplayName} ${ACCOUNT_REQUIRES_PURCHASE_ORDER_MESSAGE_MARKER}`
}

/** True when `submitTripRequest` (or similar) failed with the standard PO-required message (FE.19.9). */
export function isPurchaseOrderRequiredSubmitError(message: string | null | undefined): boolean {
	const t = (message ?? '').trim()
	return t.includes(ACCOUNT_REQUIRES_PURCHASE_ORDER_MESSAGE_MARKER)
}

export function purchaseOrderRefIsBlank(value: string | null | undefined): boolean {
	const t = (value ?? '').trim()
	return t.length === 0
}

/**
 * Loads live `customer_accounts.default_po_required` + display name (authoritative vs snapshot for submit-time checks).
 */
export async function fetchLiveAccountPoPolicy(
	supabase: SupabaseClient,
	customerAccountId: string,
): Promise<{ name: string; default_po_required: boolean } | null> {
	const { data, error } = await supabase
		.from('customer_accounts')
		.select('name, default_po_required')
		.eq('id', customerAccountId)
		.maybeSingle()

	if (error || !data) {
		return null
	}
	return {
		name: data.name as string,
		default_po_required: Boolean(data.default_po_required),
	}
}

export type PurchaseOrderAccountInsertCheck =
	| { ok: true }
	| { ok: false; message: string }

/**
 * Server-side Q4 gate after client-type enrichment: blocks insert when the linked account requires a PO and the payload is blank.
 */
export async function assertPurchaseOrderForAccountBookingInsert(
	supabase: SupabaseClient,
	args: {
		clientType: 'walk_in' | 'account_client'
		customerAccountId: string | null
		purchaseOrderRef: string | null | undefined
	},
): Promise<PurchaseOrderAccountInsertCheck> {
	if (args.clientType !== 'account_client' || !args.customerAccountId) {
		return { ok: true }
	}

	const policy = await fetchLiveAccountPoPolicy(supabase, args.customerAccountId)
	if (!policy) {
		return {
			ok: false,
			message: 'Could not verify organisation billing rules. Please try again.',
		}
	}

	if (!policy.default_po_required) {
		return { ok: true }
	}

	if (purchaseOrderRefIsBlank(args.purchaseOrderRef)) {
		return {
			ok: false,
			message: accountRequiresPurchaseOrderMessage(policy.name),
		}
	}

	return { ok: true }
}

type RpcDispatchRow = { can_dispatch: boolean; reason: string | null }

/**
 * Staff-facing message when `can_dispatch_account_booking` blocks dispatch (E2).
 */
export function staffMessageForCanDispatchAccountReason(
	reason: string,
	accountDisplayName: string | null,
): string {
	const name = accountDisplayName?.trim() || 'This organisation'

	switch (reason as CanDispatchAccountBookingReasonDb) {
		case 'po_required_and_missing':
			return `${name} requires a purchase order reference for every booking. Add it under invoicing hooks on this booking, then try again.`
		case 'contract_not_yet_active':
			return `The corporate contract for ${name} is not active yet. Adjust contract dates or wait until the start date before dispatch.`
		case 'contract_expired':
			return `The corporate contract for ${name} has expired. Renew the contract before dispatch.`
		case 'credit_limit_exceeded':
			return `Dispatch is blocked: ${name} would exceed its credit limit. Reduce exposure or raise the limit before assigning.`
		case 'overdue_invoices':
			return `Dispatch is blocked: ${name} has overdue unpaid bookings. Settle or triage account receivables before assigning.`
		case 'account_not_found':
			return 'The linked corporate account record is missing. Fix account linkage before dispatch.'
		case 'booking_not_found':
			return 'Booking was not found. Refresh and try again.'
		default:
			if (reason.startsWith('account_')) {
				return `The linked account (${name}) is not active for dispatch (${reason.replace(/^account_/, '')}). Resolve account status before assigning.`
			}
			return `This booking cannot be dispatched yet (${reason}). Check account health and booking details, then try again.`
	}
}

export function parseCanDispatchRpcRows(data: unknown): RpcDispatchRow | null {
	if (!Array.isArray(data) || data.length === 0) {
		return null
	}
	const row = data[0] as Record<string, unknown>
	const can_dispatch = Boolean(row.can_dispatch)
	const reason = typeof row.reason === 'string' ? row.reason : null
	return { can_dispatch, reason }
}

/** Display name for E2 messages — snapshot first, then live `customer_accounts.name`. */
export async function resolveAccountDisplayNameForBookingRow(
	supabase: SupabaseClient,
	args: {
		customer_account_id: string | null
		account_snapshot: unknown
	},
): Promise<string | null> {
	const snap = args.account_snapshot as AccountSnapshotJsonDb | null | undefined
	if (snap?.name && typeof snap.name === 'string' && snap.name.trim()) {
		return snap.name.trim()
	}
	if (!args.customer_account_id) {
		return null
	}
	const { data } = await supabase
		.from('customer_accounts')
		.select('name')
		.eq('id', args.customer_account_id)
		.maybeSingle()
	const n = data?.name
	return typeof n === 'string' && n.trim() ? n.trim() : null
}
