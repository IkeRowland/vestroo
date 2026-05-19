import { formatBookingIntentLabel } from '@/features/ops/booking-intent-labels'
import {
	buildOpsPaginationHref,
	coerceOpsPaginationPage,
	coerceOpsPaginationPerPage,
	type OpsPaginationPerPage,
	OPS_PAGINATION_DEFAULT_PER,
} from '@/features/ops/lib/ops-pagination-url'

import type { OpsBookingIntentFilterValue } from '@/lib/ops-booking-grid-query'

/**
 * ## `/ops/bookings` queue filters — URL ↔ Supabase (Story 12.3, US-B1)
 *
 * **Bookings-first:** predicates apply only to `from('bookings')`. Default (no params) = no column filters.
 *
 * **Combination rule (AC4):** OR within each dimension, AND across dimensions.
 * Example: `status=submitted&status=paid&payment=pending` →
 * `(status IN (submitted, paid)) AND (payment_status IN (pending))`.
 *
 * **URL keys** (repeat keys or comma-separated values per key — parser accepts both):
 * - `status` → `bookings.status` (whitelist {@link OPS_BOOKINGS_QUEUE_STATUS_ORDER})
 * - `payment` → `bookings.payment_status` (whitelist {@link OPS_BOOKINGS_QUEUE_PAYMENT_ORDER})
 * - `intent` → `bookings.booking_intent` — includes `_null` for SQL `.is('booking_intent', null)`
 * - `client` → `bookings.client_type` — `walk_in` | `account_client`
 */

/**
 * Legacy cap (pre–Story 17.10). Server list now uses **`page` × `per`** with **`per` ≤ 50**;
 * keep export for any external references — **prefer** {@link parseOpsBookingsQueueSearchParams} **`perPage`** for sizing.
 */
export const OPS_BOOKINGS_QUEUE_LIMIT = 100

const OPS_BOOKINGS_PATH = '/ops/bookings' as const

const INTENT_URL_WHITELIST: readonly OpsBookingIntentFilterValue[] = [
	'point_to_point',
	'hourly_hire',
	'corporate_pattern',
	'experience_package',
	'trip_request',
	'_null',
] as const

/** Intent chips (order). */
export const OPS_BOOKINGS_QUEUE_INTENT_CHIP_VALUES = INTENT_URL_WHITELIST

/** Align with `bookings_status_check` (VST-14 + Epic 13.9 invoicing statuses). */
export const OPS_BOOKINGS_QUEUE_STATUS_ORDER = [
	'pending',
	'pending_confirmation',
	'submitted',
	'triaged',
	'quote_sent',
	'quote_accepted',
	'quote_rejected',
	'awaiting_payment',
	'paid',
	'ready_to_assign',
	'assigned',
	'in_progress',
	'completed',
	'ready_to_invoice',
	'invoiced',
	'paid_invoice',
	'cancelled',
	'expired',
] as const

export type OpsBookingsQueueStatusValue =
	(typeof OPS_BOOKINGS_QUEUE_STATUS_ORDER)[number]

const QUEUE_STATUS_WHITELIST = new Set<string>(OPS_BOOKINGS_QUEUE_STATUS_ORDER)

/** Align with `bookings_payment_status_check` (VST-14). */
export const OPS_BOOKINGS_QUEUE_PAYMENT_ORDER = [
	'pending',
	'paid',
	'refunded',
	'failed',
	'chargeback',
] as const

export type OpsBookingsQueuePaymentValue =
	(typeof OPS_BOOKINGS_QUEUE_PAYMENT_ORDER)[number]

const QUEUE_PAYMENT_WHITELIST = new Set<string>(OPS_BOOKINGS_QUEUE_PAYMENT_ORDER)

export function allParamValues(
	raw: Record<string, string | string[] | undefined>,
	key: string,
): string[] {
	const v = raw[key]
	if (v === undefined) {
		return []
	}
	const arr = Array.isArray(v) ? v : [v]
	const out: string[] = []
	for (const s of arr) {
		const t = (s ?? '').trim()
		if (!t) {
			continue
		}
		if (t.includes(',')) {
			for (const part of t.split(',')) {
				const p = part.trim()
				if (p) {
					out.push(p)
				}
			}
		} else {
			out.push(t)
		}
	}
	return out
}

function uniqueSortedStatuses(values: string[]): string[] {
	const ok = values.filter((s) => QUEUE_STATUS_WHITELIST.has(s))
	const order = OPS_BOOKINGS_QUEUE_STATUS_ORDER
	return [...new Set(ok)].sort(
		(a, b) => order.indexOf(a as OpsBookingsQueueStatusValue) - order.indexOf(b as OpsBookingsQueueStatusValue),
	)
}

function uniqueSortedPayments(values: string[]): string[] {
	const ok = values.filter((s) => QUEUE_PAYMENT_WHITELIST.has(s))
	const order = OPS_BOOKINGS_QUEUE_PAYMENT_ORDER
	return [...new Set(ok)].sort(
		(a, b) =>
			order.indexOf(a as OpsBookingsQueuePaymentValue) -
			order.indexOf(b as OpsBookingsQueuePaymentValue),
	)
}

function parseIntentTokens(values: string[]): OpsBookingIntentFilterValue[] {
	const out: OpsBookingIntentFilterValue[] = []
	for (const v of values) {
		const t = v.trim() as OpsBookingIntentFilterValue
		if (INTENT_URL_WHITELIST.includes(t as OpsBookingIntentFilterValue)) {
			out.push(t)
		}
	}
	return [...new Set(out)]
}

function uniqueSortedClients(values: string[]): ('walk_in' | 'account_client')[] {
	const out: ('walk_in' | 'account_client')[] = []
	for (const v of values) {
		const t = v.trim()
		if (t === 'walk_in' || t === 'account_client') {
			out.push(t)
		}
	}
	return [...new Set(out)].sort()
}

/**
 * Parsed queue filters — **multi-select per dimension** (OR within, AND across).
 */
export type OpsBookingsQueueParsed = {
	statuses: string[]
	payments: string[]
	intents: OpsBookingIntentFilterValue[]
	clients: ('walk_in' | 'account_client')[]
	/** 1-based; coerced from URL **`page`**. */
	page: number
	/** Page size — **`10` \| `20` \| `50`** from URL **`per`**. */
	perPage: OpsPaginationPerPage
}

function firstParam(raw: Record<string, string | string[] | undefined>, key: string): string | undefined {
	const vals = allParamValues(raw, key)
	return vals[0]
}

export function parseOpsBookingsQueueSearchParams(
	raw: Record<string, string | string[] | undefined>,
): OpsBookingsQueueParsed {
	return {
		statuses: uniqueSortedStatuses(allParamValues(raw, 'status')),
		payments: uniqueSortedPayments(allParamValues(raw, 'payment')),
		intents: parseIntentTokens(allParamValues(raw, 'intent')),
		clients: uniqueSortedClients(allParamValues(raw, 'client')),
		page: coerceOpsPaginationPage(firstParam(raw, 'page')),
		perPage: coerceOpsPaginationPerPage(firstParam(raw, 'per')),
	}
}

/** Queue filter dimensions only — omit **`page`** / **`per`** (merged via {@link buildOpsPaginationHref}). */
export function serializeOpsBookingsQueueSearchParams(p: OpsBookingsQueueParsed): string {
	const u = new URLSearchParams()
	for (const s of p.statuses) {
		u.append('status', s)
	}
	for (const pay of p.payments) {
		u.append('payment', pay)
	}
	for (const i of p.intents) {
		u.append('intent', i)
	}
	for (const c of p.clients) {
		u.append('client', c)
	}
	return u.toString()
}

export function opsBookingsPathWithQuery(
	p: OpsBookingsQueueParsed,
	pathname: string = OPS_BOOKINGS_PATH,
): string {
	const filterQs = serializeOpsBookingsQueueSearchParams(p)
	return buildOpsPaginationHref({
		pathname,
		search: filterQs,
		page: p.page,
		per: p.perPage,
	})
}

export function opsBookingsQueueHref(
	current: OpsBookingsQueueParsed,
	overrides: Partial<OpsBookingsQueueParsed>,
	pathname: string = OPS_BOOKINGS_PATH,
): string {
	const filterTouched =
		overrides.statuses !== undefined ||
		overrides.payments !== undefined ||
		overrides.intents !== undefined ||
		overrides.clients !== undefined

	const next: OpsBookingsQueueParsed = {
		statuses: overrides.statuses !== undefined ? overrides.statuses : current.statuses,
		payments: overrides.payments !== undefined ? overrides.payments : current.payments,
		intents: overrides.intents !== undefined ? overrides.intents : current.intents,
		clients: overrides.clients !== undefined ? overrides.clients : current.clients,
		perPage: overrides.perPage !== undefined ? overrides.perPage : current.perPage,
		page:
			overrides.page !== undefined
				? overrides.page
				: filterTouched
					? 1
					: current.page,
	}
	return opsBookingsPathWithQuery(next, pathname)
}

function sortIntentValues(values: OpsBookingIntentFilterValue[]): OpsBookingIntentFilterValue[] {
	const order = [...OPS_BOOKINGS_QUEUE_INTENT_CHIP_VALUES]
	return [...new Set(values)].sort(
		(a, b) => order.indexOf(a) - order.indexOf(b),
	)
}

export function toggleQueueStatus(
	current: OpsBookingsQueueParsed,
	status: OpsBookingsQueueStatusValue,
): OpsBookingsQueueParsed {
	const set = new Set(current.statuses)
	if (set.has(status)) {
		set.delete(status)
	} else {
		set.add(status)
	}
	return { ...current, statuses: uniqueSortedStatuses([...set]), page: 1 }
}

export function toggleQueuePayment(
	current: OpsBookingsQueueParsed,
	payment: OpsBookingsQueuePaymentValue,
): OpsBookingsQueueParsed {
	const set = new Set(current.payments)
	if (set.has(payment)) {
		set.delete(payment)
	} else {
		set.add(payment)
	}
	return { ...current, payments: uniqueSortedPayments([...set]), page: 1 }
}

export function toggleQueueIntent(
	current: OpsBookingsQueueParsed,
	intent: OpsBookingIntentFilterValue,
): OpsBookingsQueueParsed {
	const set = new Set(current.intents)
	if (set.has(intent)) {
		set.delete(intent)
	} else {
		set.add(intent)
	}
	return { ...current, intents: sortIntentValues([...set]), page: 1 }
}

export function toggleQueueClient(
	current: OpsBookingsQueueParsed,
	client: 'walk_in' | 'account_client',
): OpsBookingsQueueParsed {
	const set = new Set(current.clients)
	if (set.has(client)) {
		set.delete(client)
	} else {
		set.add(client)
	}
	return { ...current, clients: uniqueSortedClients([...set]), page: 1 }
}

/**
 * Returns param keys where **any** value was non-empty but entirely rejected (whitelist).
 */
export function getIgnoredBookingsQueueParamKeys(
	raw: Record<string, string | string[] | undefined>,
): ('intent' | 'status' | 'payment' | 'client')[] {
	const ignored: ('intent' | 'status' | 'payment' | 'client')[] = []

	const statusVals = allParamValues(raw, 'status')
	if (statusVals.some((s) => s.trim() !== '' && !QUEUE_STATUS_WHITELIST.has(s.trim()))) {
		ignored.push('status')
	}

	const paymentVals = allParamValues(raw, 'payment')
	if (
		paymentVals.some((s) => s.trim() !== '' && !QUEUE_PAYMENT_WHITELIST.has(s.trim()))
	) {
		ignored.push('payment')
	}

	const intentVals = allParamValues(raw, 'intent')
	const intentOk = (t: string) =>
		INTENT_URL_WHITELIST.includes(t.trim() as OpsBookingIntentFilterValue)
	if (intentVals.some((s) => s.trim() !== '' && !intentOk(s))) {
		ignored.push('intent')
	}

	const clientVals = allParamValues(raw, 'client')
	if (
		clientVals.some(
			(s) =>
				s.trim() !== '' &&
				s.trim() !== 'walk_in' &&
				s.trim() !== 'account_client',
		)
	) {
		ignored.push('client')
	}

	return ignored
}

/** Human-readable status for filter UI (bookings.status enum / snake_case). */
export function formatQueueStatusLabel(statusKey: string): string {
	return statusKey
		.split('_')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' ')
}

/** Labels for `/ops/bookings` intent filter dropdown (includes `_null` → Standard / empty). */
export function formatQueueIntentFilterLabel(value: OpsBookingIntentFilterValue): string {
	if (value === '_null') {
		return 'Standard / empty'
	}
	return formatBookingIntentLabel(value === '' ? null : value)
}

/** Predicate helpers for Supabase — use from the bookings page server query. */
export function hasActiveQueueFilters(parsed: OpsBookingsQueueParsed): boolean {
	return (
		parsed.statuses.length > 0 ||
		parsed.payments.length > 0 ||
		parsed.intents.length > 0 ||
		parsed.clients.length > 0
	)
}

/**
 * Single status token for **Ready to assign** (Epic 14.1 trigger, 14.8 chip, 14.9 fulfil `queue=paid`).
 * Use for `.eq('status', …)` so `/ops/bookings` and `/ops/fulfil` stay aligned.
 */
export const OPS_BOOKINGS_READY_TO_ASSIGN_STATUS: OpsBookingsQueueStatusValue =
	'ready_to_assign'

/** Ops home “needs attention” slice (Story 12.2) — triage before payment / assignment. */
export const OPS_BOOKINGS_QUEUE_NEEDS_ATTENTION_STATUSES = [
	'pending_confirmation',
	'submitted',
	'triaged',
	'quote_sent',
	'awaiting_payment',
] as const satisfies readonly OpsBookingsQueueStatusValue[]

/**
 * True when **`parsed`** is exactly one **`status`** and no other queue dimensions.
 */
export function isSingleStatusQueuePreset(
	parsed: OpsBookingsQueueParsed,
	status: OpsBookingsQueueStatusValue,
): boolean {
	return (
		parsed.statuses.length === 1 &&
		parsed.statuses[0] === status &&
		parsed.payments.length === 0 &&
		parsed.intents.length === 0 &&
		parsed.clients.length === 0
	)
}

/**
 * The **Ready to assign** saved view (US-E1 / Story 14.8): only
 * `status=ready_to_assign` — no extra client/intent/payment filters.
 */
export function isReadyToAssignPreset(parsed: OpsBookingsQueueParsed): boolean {
	return isSingleStatusQueuePreset(parsed, OPS_BOOKINGS_READY_TO_ASSIGN_STATUS)
}

/** Multi-status triage preset — matches {@link OPS_BOOKINGS_QUEUE_NEEDS_ATTENTION_STATUSES}. */
export function isNeedsAttentionPreset(parsed: OpsBookingsQueueParsed): boolean {
	if (
		parsed.payments.length > 0 ||
		parsed.intents.length > 0 ||
		parsed.clients.length > 0
	) {
		return false
	}
	const set = new Set(parsed.statuses)
	if (set.size !== OPS_BOOKINGS_QUEUE_NEEDS_ATTENTION_STATUSES.length) {
		return false
	}
	return OPS_BOOKINGS_QUEUE_NEEDS_ATTENTION_STATUSES.every((s) => set.has(s))
}

export function isCompletedQueuePreset(parsed: OpsBookingsQueueParsed): boolean {
	return isSingleStatusQueuePreset(parsed, 'completed')
}

export function isCancelledQueuePreset(parsed: OpsBookingsQueueParsed): boolean {
	return isSingleStatusQueuePreset(parsed, 'cancelled')
}

/**
 * Href for the **Ready to assign** chip (replaces all other queue filters with this single status).
 */
export const OPS_BOOKINGS_READY_TO_ASSIGN_HREF = opsBookingsPathWithQuery({
	statuses: [OPS_BOOKINGS_READY_TO_ASSIGN_STATUS],
	payments: [],
	intents: [],
	clients: [],
	page: 1,
	perPage: OPS_PAGINATION_DEFAULT_PER,
})

export const OPS_BOOKINGS_NEEDS_ATTENTION_HREF = opsBookingsPathWithQuery({
	statuses: [...OPS_BOOKINGS_QUEUE_NEEDS_ATTENTION_STATUSES],
	payments: [],
	intents: [],
	clients: [],
	page: 1,
	perPage: OPS_PAGINATION_DEFAULT_PER,
})

export const OPS_BOOKINGS_COMPLETED_HREF = opsBookingsPathWithQuery({
	statuses: ['completed'],
	payments: [],
	intents: [],
	clients: [],
	page: 1,
	perPage: OPS_PAGINATION_DEFAULT_PER,
})

export const OPS_BOOKINGS_CANCELLED_HREF = opsBookingsPathWithQuery({
	statuses: ['cancelled'],
	payments: [],
	intents: [],
	clients: [],
	page: 1,
	perPage: OPS_PAGINATION_DEFAULT_PER,
})
