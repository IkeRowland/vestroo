import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import type { OpsBookingIntentFilterValue } from '@/lib/ops-booking-grid-query'
import {
	allParamValues,
	getIgnoredBookingsQueueParamKeys,
	parseOpsBookingsQueueSearchParams,
} from '@/lib/ops-bookings-queue-query'

/**
 * Account-client workflow slice of **`/ops/bookings`** (`client=account_client` + status filters).
 *
 * Legacy **`/ops/accounts`** routes redirect here (bookmark preservation).
 *
 * ## Prior epic notes — `/ops/accounts` stage tabs + optional `intent` (Story 16.21 / US-A2)
 *
 * All list/count predicates are composed with **`bookings.client_type = 'account_client'`** on the server.
 *
 * **Stage → SQL predicate (lock per Reconciliation in `docs/stories/16.21.story.md`):**
 *
 * | Stage tab | URL `stage` | Server predicate (after `client_type='account_client'`) | CTA in row |
 * |-----------|-------------|---------------------------------------------------------|------------|
 * | New                  | `new`                  | `status = 'submitted'`                                                                       | **Triage** (`triageAccountBookingAction`) |
 * | Triaged              | `triaged`              | `status = 'triaged' AND availability_checked_at IS NULL`                                     | **Check availability** (B2 route gated) |
 * | Availability checked | `availability_checked` | `status = 'triaged' AND availability_checked_at IS NOT NULL`                                 | **Assign trip** (`opsFulfilAssignBookingHref`) |
 * | Assigned             | `assigned`             | `status = 'assigned'`                                                                        | **Confirm dispatch** (booking detail; respect `can_dispatch_account_booking` chip) |
 * | In progress          | `in_progress`          | `status = 'in_progress'`                                                                     | view-only |
 * | Completed            | `completed`            | `status IN ('completed', 'ready_to_invoice')`                                                | **Hand off to invoicing** (`/ops/invoicing?tab=ready`) |
 * | Invoiced             | `invoiced`             | `status = 'invoiced'`                                                                        | **Mark EFT received** (`MarkPaymentReceivedDialog` → `markBookingPaymentReceivedAction`, Q32) |
 * | Paid                 | `paid`                 | `status IN ('paid', 'paid_invoice')`                                                         | view-only (terminal) |
 *
 * **Notes:**
 * - **Completed** folds `ready_to_invoice` so account rows that auto-flipped via the trip-completion hook
 *   (`shouldSetBookingReadyToInvoiceOnTripCompleted`) remain visible to ops staff for the **Hand off to invoicing** click-through.
 * - **Paid** folds `paid` (set by **N3** `markBookingPaymentReceivedAction` for accounts) and `paid_invoice` (set by the
 *   legacy `markPaidAction` from `/ops/invoicing`) so the terminal tab is exhaustive.
 * - **Invoiced** intentionally relies on `status='invoiced'` only — the N3 action transitions both `status` and
 *   `payment_status` atomically, so a `payment_status` filter is redundant.
 */

/** @deprecated Legacy pathname — prefer {@link OPS_BOOKINGS_PATH} with `client=account_client`. */
export const OPS_ACCOUNTS_PATH = '/ops/accounts' as const

export const OPS_ACCOUNTS_NEW_QUEUE_HREF =
	`${OPS_BOOKINGS_PATH}?client=account_client&status=submitted` as const

export type OpsAccountsStageKey =
	| 'new'
	| 'triaged'
	| 'availability_checked'
	| 'assigned'
	| 'in_progress'
	| 'completed'
	| 'invoiced'
	| 'paid'

export const OPS_ACCOUNTS_STAGE_ORDER: readonly OpsAccountsStageKey[] = [
	'new',
	'triaged',
	'availability_checked',
	'assigned',
	'in_progress',
	'completed',
	'invoiced',
	'paid',
] as const

const STAGE_SET = new Set<string>(OPS_ACCOUNTS_STAGE_ORDER)

export type OpsAccountsQueueParsed = {
	stage: OpsAccountsStageKey
	intents: OpsBookingIntentFilterValue[]
}

function uniqueSortedIntentSlice(
	intents: OpsBookingIntentFilterValue[],
): OpsBookingIntentFilterValue[] {
	if (intents.length <= 1) {
		return intents
	}
	return [intents[0]]
}

/**
 * Parses `stage` (default **`new`**) and rejects unknown tokens. Optional `intent` is parsed via
 * {@link parseOpsAccountsQueueFull}.
 */
export function parseOpsAccountsQueueSearchParams(
	raw: Record<string, string | string[] | undefined>,
): OpsAccountsStageKey {
	const stageVals = allParamValues(raw, 'stage')
	const first = stageVals[0]?.trim()
	if (first && STAGE_SET.has(first)) {
		return first as OpsAccountsStageKey
	}
	return 'new'
}

export function parseOpsAccountsQueueFull(
	raw: Record<string, string | string[] | undefined>,
): OpsAccountsQueueParsed {
	const bookingParsed = parseOpsBookingsQueueSearchParams(raw)
	return {
		stage: parseOpsAccountsQueueSearchParams(raw),
		intents: uniqueSortedIntentSlice(bookingParsed.intents),
	}
}

export function getIgnoredAccountsQueueParamKeys(
	raw: Record<string, string | string[] | undefined>,
): ('stage' | 'intent')[] {
	const ignored: ('stage' | 'intent')[] = []
	const stageVals = allParamValues(raw, 'stage')
	if (stageVals.some((s) => s.trim() !== '' && !STAGE_SET.has(s.trim()))) {
		ignored.push('stage')
	}
	const bookingIgnored = getIgnoredBookingsQueueParamKeys(raw)
	if (bookingIgnored.includes('intent')) {
		ignored.push('intent')
	}
	return ignored
}

/** Maps account queue tab → `/ops/bookings` `status` keys (best-effort vs tab SQL). */
export function accountsStageToBookingsStatuses(stage: OpsAccountsStageKey): string[] {
	switch (stage) {
		case 'new':
			return ['submitted']
		case 'triaged':
		case 'availability_checked':
			return ['triaged']
		case 'assigned':
			return ['assigned']
		case 'in_progress':
			return ['in_progress']
		case 'completed':
			return ['completed', 'ready_to_invoice']
		case 'invoiced':
			return ['invoiced']
		case 'paid':
			return ['paid', 'paid_invoice']
		default: {
			const _e: never = stage
			return _e
		}
	}
}

export function accountsQueueHref(overrides: Partial<OpsAccountsQueueParsed>): string {
	const stage = overrides.stage ?? 'new'
	const u = new URLSearchParams()
	u.set('client', 'account_client')
	for (const s of accountsStageToBookingsStatuses(stage)) {
		u.append('status', s)
	}
	const intents = overrides.intents
	if (intents !== undefined) {
		for (const i of intents) {
			u.append('intent', i)
		}
	}
	const qs = u.toString()
	return qs ? `${OPS_BOOKINGS_PATH}?${qs}` : OPS_BOOKINGS_PATH
}

/** Minimal row fields for deriving account stage on a mixed or detail context. */
export type OpsAccountsStageDeriveInput = {
	client_type: string | null
	status: string | null
	availability_checked_at: string | null
}

/**
 * Maps an **account_client** row to the same {@link OpsAccountsStageKey} model as `/ops/accounts` tabs.
 * Returns **`null`** when `client_type` is not account or status is outside the account funnel.
 */
export function deriveAccountsQueueStageForBookingRow(
	row: OpsAccountsStageDeriveInput,
): OpsAccountsStageKey | null {
	if (row.client_type !== 'account_client') {
		return null
	}
	const st = row.status ?? ''
	if (st === 'submitted') {
		return 'new'
	}
	if (st === 'triaged') {
		const hasAvail =
			row.availability_checked_at != null && String(row.availability_checked_at).trim() !== ''
		return hasAvail ? 'availability_checked' : 'triaged'
	}
	if (st === 'assigned') {
		return 'assigned'
	}
	if (st === 'in_progress') {
		return 'in_progress'
	}
	if (st === 'completed' || st === 'ready_to_invoice') {
		return 'completed'
	}
	if (st === 'invoiced') {
		return 'invoiced'
	}
	if (st === 'paid' || st === 'paid_invoice') {
		return 'paid'
	}
	return null
}

export function opsAccountsStageLabel(stage: OpsAccountsStageKey): string {
	switch (stage) {
		case 'new':
			return 'New'
		case 'triaged':
			return 'Triaged'
		case 'availability_checked':
			return 'Availability checked'
		case 'assigned':
			return 'Assigned'
		case 'in_progress':
			return 'In progress'
		case 'completed':
			return 'Completed'
		case 'invoiced':
			return 'Invoiced'
		case 'paid':
			return 'Paid'
		default: {
			const _e: never = stage
			return _e
		}
	}
}
