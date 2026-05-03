import type { AccountSnapshotJsonDb } from '@/types/database.types'
import type { WebClientTypeResolution } from '@/actions/booking-schemas'

/**
 * Pure helpers + types for Q6 client-type resolution. **Safe to import from client
 * components** (e.g. `BookingAccountDomainGate`). Server-only helpers that need
 * `next/headers` / Supabase server client live in
 * `@/actions/resolvePortalVerifiedAccountClient`.
 */

/** Persisted under `bookings.booking_metadata.client_type_source` — Story 12.5 / Epic 12 Q6 (+ `ops_manual` staff-only; **14.5** direct pay link). */
export type ClientTypeSourceValue =
	| WebClientTypeResolution['clientTypeSource']
	| 'ops_manual'
	| 'direct_pay_skip'

export type ClientTypeResolutionPayload = WebClientTypeResolution

export type AccountDomainCandidateRow = {
	id: string
	name: string
	credit_terms_days: number
	default_billing_entity_ref: string | null
	default_po_required: boolean
}

export function buildAccountSnapshotFromRow(row: AccountDomainCandidateRow): AccountSnapshotJsonDb {
	return {
		name: row.name,
		credit_terms_days: row.credit_terms_days,
		default_billing_entity_ref: row.default_billing_entity_ref,
		po_required_at_snapshot: row.default_po_required,
	}
}

/**
 * Validates Q6 payload against the booker email domain (server-side; prevents forged account ids).
 */
export function verifyAccountIdAllowedForEmailDomain(
	candidates: AccountDomainCandidateRow[],
	accountId: string,
): AccountDomainCandidateRow | null {
	return candidates.find((c) => c.id === accountId) ?? null
}

/**
 * Enforces Q6: if the email domain matches accounts, the booker must confirm (yes/no/dismiss);
 * `no_match` is only valid when the domain truly matches zero active accounts.
 */
export function assertClientResolutionForSubmit(
	candidates: AccountDomainCandidateRow[],
	resolution: WebClientTypeResolution | undefined,
): WebClientTypeResolution {
	const eff: WebClientTypeResolution =
		resolution ?? {
			clientType: 'walk_in',
			customerAccountId: null,
			clientTypeSource: 'no_match',
		}

	if (candidates.length === 0) {
		if (eff.clientType === 'account_client') {
			throw new Error('No organisation matches this email domain.')
		}
		return {
			clientType: 'walk_in',
			customerAccountId: null,
			clientTypeSource: 'no_match',
		}
	}

	if (eff.clientType === 'account_client') {
		if (!eff.customerAccountId) {
			throw new Error('Select an organisation for this booking.')
		}
		const row = verifyAccountIdAllowedForEmailDomain(candidates, eff.customerAccountId)
		if (!row) {
			throw new Error('The selected account does not match your email domain.')
		}
		return {
			clientType: 'account_client',
			customerAccountId: row.id,
			clientTypeSource: 'user_confirmed_domain_match',
		}
	}

	if (eff.clientTypeSource !== 'user_declined_domain_match') {
		throw new Error(
			'Please confirm whether this is a business booking on a corporate account.',
		)
	}
	return {
		clientType: 'walk_in',
		customerAccountId: null,
		clientTypeSource: 'user_declined_domain_match',
	}
}

/**
 * Maps validated Q6 resolution + candidates to `bookings` columns and `booking_metadata.client_type_source`.
 */
export function resolveBookingClientTypeInsert(
	validated: WebClientTypeResolution,
	candidates: AccountDomainCandidateRow[],
): {
	client_type: 'walk_in' | 'account_client'
	customer_account_id: string | null
	account_snapshot: AccountSnapshotJsonDb | null
	client_type_source: WebClientTypeResolution['clientTypeSource']
} {
	if (validated.clientType === 'walk_in') {
		return {
			client_type: 'walk_in',
			customer_account_id: null,
			account_snapshot: null,
			client_type_source: validated.clientTypeSource,
		}
	}

	const row = verifyAccountIdAllowedForEmailDomain(candidates, validated.customerAccountId!)
	if (!row) {
		throw new Error('The selected account does not match your email domain.')
	}
	return {
		client_type: 'account_client',
		customer_account_id: row.id,
		account_snapshot: buildAccountSnapshotFromRow(row),
		client_type_source: 'user_confirmed_domain_match',
	}
}

// Server-only `resolvePortalVerifiedAccountClientInsert` lives in
// `@/actions/resolvePortalVerifiedAccountClient` (it uses `next/headers` via the Supabase
// server client and must NOT be reachable from a client-component bundle).
