import { formatBookingIntentLabel } from '@/features/ops/booking-intent-labels'
import { escapeIlikePattern, type OpsBookingIntentFilterValue } from '@/lib/ops-booking-grid-query'
import {
	formatQueueStatusLabel,
	OPS_BOOKINGS_QUEUE_INTENT_CHIP_VALUES,
	OPS_BOOKINGS_QUEUE_STATUS_ORDER,
	type OpsBookingsQueueStatusValue,
} from '@/lib/ops-bookings-queue-query'

/** URL param namespace — avoids clashing with `/ops/bookings` (`status`, `intent`, …). */
export const ACCT_PARAM = {
	page: 'acct_page',
	sort: 'acct_sort',
	status: 'acct_status',
	intent: 'acct_intent',
	window: 'acct_win',
	q: 'acct_q',
	dateFrom: 'acct_from',
	dateTo: 'acct_to',
	trip: 'acct_trip',
} as const

export const ACCOUNT_BOOKINGS_LIST_PAGE_SIZE = 25

/** Max 1-based page index (offset cap). */
export const ACCOUNT_BOOKINGS_LIST_MAX_PAGE = 200

const STATUS_WHITELIST = new Set<string>(OPS_BOOKINGS_QUEUE_STATUS_ORDER)

export type AccountBookingsTimeWindow = 'all' | 'next_7d' | 'next_30d' | 'past_90d'

export type AccountBookingsListSort = 'pickup_asc' | 'pickup_desc'

/** Shorthand keys in **`acct_trip=`** (maps to `bookings.booking_intent`). */
export type AccountBookingsTripTypeKey = 'p2p' | 'hourly' | 'tour' | 'cp'

const TRIP_TYPE_KEY_WHITELIST = new Set<AccountBookingsTripTypeKey>(['p2p', 'hourly', 'tour', 'cp'])

const TRIP_TYPE_TO_INTENT: Record<AccountBookingsTripTypeKey, string> = {
	p2p: 'point_to_point',
	hourly: 'hourly_hire',
	tour: 'experience_package',
	cp: 'corporate_pattern',
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function accountBookingsTripTypeToBookingIntent(value: AccountBookingsTripTypeKey): string {
	return TRIP_TYPE_TO_INTENT[value]
}

export function parseAccountBookingsTripTypeKeys(values: string[]): AccountBookingsTripTypeKey[] {
	const out: AccountBookingsTripTypeKey[] = []
	for (const v of values) {
		const t = v.trim() as AccountBookingsTripTypeKey
		if (TRIP_TYPE_KEY_WHITELIST.has(t)) out.push(t)
	}
	return [...new Set(out)]
}

export function accountBookingsTripTypesToIntents(types: AccountBookingsTripTypeKey[]): string[] {
	return types.map((k) => TRIP_TYPE_TO_INTENT[k])
}

export type AccountBookingsListParsed = {
	page: number
	sort: AccountBookingsListSort
	statuses: string[]
	intents: OpsBookingIntentFilterValue[]
	window: AccountBookingsTimeWindow
	/** Full-text / ref search on origin, destination, and payment ref (server `ILIKE`). */
	search: string
	/** Inclusive YYYY-MM-DD, UTC day bounds on `pickup_datetime` when set. */
	dateFrom: string | null
	dateTo: string | null
	/** Point-to-point, hourly, tour, corporate pattern (`cp` URL token). */
	tripTypes: AccountBookingsTripTypeKey[]
	/**
	 * Legacy **`?id=`** deep link — list page redirects to **`/account/bookings/[id]`**.
	 * Cleared when list filters are changed in the account UI (same pattern as **FE.18.3** flags).
	 */
	selectedBookingId: string | null
	/**
	 * Epic **FE.18.3** dashboard deep link: **`?period=this_month`** (calendar month on `pickup_datetime`, UTC).
	 * Cleared when the user changes list filters in {@link AccountBookingsFilters}.
	 */
	epicPeriodThisMonth: boolean
	/**
	 * Epic **FE.18.3** virtual preset: **`?status=upcoming`** (future pickup + non-terminal pipeline statuses).
	 * Cleared when the user changes list filters.
	 */
	epicStatusUpcoming: boolean
}

/**
 * Bookings that still represent “live” trip work (used with future **`pickup_datetime`** for **upcoming**).
 * Excludes completed / cancelled / expired / fully paid-invoice terminal rows.
 */
export const ACCOUNT_DASHBOARD_UPCOMING_STATUSES: readonly string[] = [
	'pending',
	'pending_confirmation',
	'submitted',
	'triaged',
	'quote_sent',
	'quote_rejected',
	'quote_accepted',
	'awaiting_payment',
	'paid',
	'ready_to_assign',
	'assigned',
	'in_progress',
	'ready_to_invoice',
	'invoiced',
]

const WINDOW_WHITELIST = new Set<AccountBookingsTimeWindow>(['all', 'next_7d', 'next_30d', 'past_90d'])

const SORT_WHITELIST: readonly AccountBookingsListSort[] = ['pickup_asc', 'pickup_desc'] as const

function allParamValues(raw: Record<string, string | string[] | undefined>, key: string): string[] {
	const v = raw[key]
	if (v === undefined) return []
	const arr = Array.isArray(v) ? v : [v]
	const out: string[] = []
	for (const s of arr) {
		const t = (s ?? '').trim()
		if (!t) continue
		if (t.includes(',')) {
			for (const part of t.split(',')) {
				const p = part.trim()
				if (p) out.push(p)
			}
		} else {
			out.push(t)
		}
	}
	return out
}

function parseAccountIntentTokens(values: string[]): OpsBookingIntentFilterValue[] {
	const allow = OPS_BOOKINGS_QUEUE_INTENT_CHIP_VALUES
	const out: OpsBookingIntentFilterValue[] = []
	for (const v of values) {
		const t = v.trim() as OpsBookingIntentFilterValue
		if (allow.includes(t as OpsBookingIntentFilterValue)) {
			out.push(t)
		}
	}
	return [...new Set(out)]
}

function uniqueSortedStatuses(values: string[]): string[] {
	const ok = values.filter((s) => STATUS_WHITELIST.has(s))
	const order = OPS_BOOKINGS_QUEUE_STATUS_ORDER
	return [...new Set(ok)].sort(
		(a, b) => order.indexOf(a as OpsBookingsQueueStatusValue) - order.indexOf(b as OpsBookingsQueueStatusValue),
	)
}

function parsePage(raw: Record<string, string | string[] | undefined>): number {
	const v = allParamValues(raw, ACCT_PARAM.page)[0]
	const n = v ? Number.parseInt(v, 10) : 1
	if (!Number.isFinite(n) || n < 1) return 1
	return Math.min(n, ACCOUNT_BOOKINGS_LIST_MAX_PAGE)
}

function parseSort(raw: Record<string, string | string[] | undefined>): AccountBookingsListSort {
	const v = allParamValues(raw, ACCT_PARAM.sort)[0] as AccountBookingsListSort | undefined
	if (v && (SORT_WHITELIST as readonly string[]).includes(v)) return v
	return 'pickup_asc'
}

function parseWindow(raw: Record<string, string | string[] | undefined>): AccountBookingsTimeWindow {
	const v = allParamValues(raw, ACCT_PARAM.window)[0] as AccountBookingsTimeWindow | undefined
	if (v && WINDOW_WHITELIST.has(v)) return v
	return 'all'
}

function parseDateOnlyParam(raw: Record<string, string | string[] | undefined>, key: string): string | null {
	const s = (allParamValues(raw, key)[0] ?? '').trim()
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
	return s
}

function parseSearchQ(raw: Record<string, string | string[] | undefined>): string {
	const s = (allParamValues(raw, ACCT_PARAM.q)[0] ?? '').trim()
	return s.length > 200 ? s.slice(0, 200) : s
}

function parseSelectedBookingId(raw: Record<string, string | string[] | undefined>): string | null {
	const s = (allParamValues(raw, 'id')[0] ?? '').trim()
	if (!s) return null
	if (!UUID_RE.test(s)) return null
	return s
}

export function hasAccountBookingsCustomDateRange(p: AccountBookingsListParsed): boolean {
	return p.dateFrom != null || p.dateTo != null
}

export function parseAccountBookingsListSearchParams(
	raw: Record<string, string | string[] | undefined>,
): AccountBookingsListParsed {
	const dateFrom = parseDateOnlyParam(raw, ACCT_PARAM.dateFrom)
	const dateTo = parseDateOnlyParam(raw, ACCT_PARAM.dateTo)
	const hasDate = dateFrom != null || dateTo != null
	const tripTypes = parseAccountBookingsTripTypeKeys(allParamValues(raw, ACCT_PARAM.trip))
	const selectedBookingId = parseSelectedBookingId(raw)

	const epicPeriodThisMonth = !hasDate && allParamValues(raw, 'period')[0] === 'this_month'
	const epicStatusUpcoming = !hasDate && allParamValues(raw, 'status')[0] === 'upcoming'

	return {
		page: parsePage(raw),
		sort: parseSort(raw),
		statuses: uniqueSortedStatuses(allParamValues(raw, ACCT_PARAM.status)),
		intents: parseAccountIntentTokens(allParamValues(raw, ACCT_PARAM.intent)),
		window: parseWindow(raw),
		search: parseSearchQ(raw),
		dateFrom: hasDate ? dateFrom : null,
		dateTo: hasDate ? dateTo : null,
		tripTypes,
		selectedBookingId,
		epicPeriodThisMonth,
		epicStatusUpcoming,
	}
}

export function serializeAccountBookingsListSearchParams(p: AccountBookingsListParsed): string {
	const u = new URLSearchParams()
	if (p.page > 1) u.set(ACCT_PARAM.page, String(p.page))
	if (p.sort !== 'pickup_asc') u.set(ACCT_PARAM.sort, p.sort)
	for (const s of p.statuses) u.append(ACCT_PARAM.status, s)
	for (const i of p.intents) u.append(ACCT_PARAM.intent, i)
	if (p.window !== 'all') u.set(ACCT_PARAM.window, p.window)
	if (p.search.trim() !== '') u.set(ACCT_PARAM.q, p.search.trim())
	if (p.dateFrom) u.set(ACCT_PARAM.dateFrom, p.dateFrom)
	if (p.dateTo) u.set(ACCT_PARAM.dateTo, p.dateTo)
	for (const t of p.tripTypes) u.append(ACCT_PARAM.trip, t)
	if (p.selectedBookingId) u.set('id', p.selectedBookingId)
	if (p.epicPeriodThisMonth) u.set('period', 'this_month')
	if (p.epicStatusUpcoming) u.set('status', 'upcoming')
	return u.toString()
}

export function accountBookingsListPathWithQuery(p: AccountBookingsListParsed): string {
	const qs = serializeAccountBookingsListSearchParams(p)
	return qs.length > 0 ? `/account/bookings?${qs}` : '/account/bookings'
}

export function accountBookingsListHref(
	current: AccountBookingsListParsed,
	overrides: Partial<AccountBookingsListParsed>,
): string {
	const next: AccountBookingsListParsed = {
		page: overrides.page !== undefined ? overrides.page : current.page,
		sort: overrides.sort !== undefined ? overrides.sort : current.sort,
		statuses: overrides.statuses !== undefined ? overrides.statuses : current.statuses,
		intents: overrides.intents !== undefined ? overrides.intents : current.intents,
		window: overrides.window !== undefined ? overrides.window : current.window,
		search: overrides.search !== undefined ? overrides.search : current.search,
		dateFrom: overrides.dateFrom !== undefined ? overrides.dateFrom : current.dateFrom,
		dateTo: overrides.dateTo !== undefined ? overrides.dateTo : current.dateTo,
		tripTypes: overrides.tripTypes !== undefined ? overrides.tripTypes : current.tripTypes,
		selectedBookingId:
			overrides.selectedBookingId !== undefined ? overrides.selectedBookingId : current.selectedBookingId,
		epicPeriodThisMonth:
			overrides.epicPeriodThisMonth !== undefined ? overrides.epicPeriodThisMonth : current.epicPeriodThisMonth,
		epicStatusUpcoming:
			overrides.epicStatusUpcoming !== undefined ? overrides.epicStatusUpcoming : current.epicStatusUpcoming,
	}
	return accountBookingsListPathWithQuery(next)
}

/** Base query string for shared **`Pagination`** (omits **`acct_page`**; caller merges page via `buildSaaSPaginationHref`). */
export function accountBookingsListSearchExcludingPage(p: AccountBookingsListParsed): string {
	const u = new URLSearchParams(serializeAccountBookingsListSearchParams(p))
	u.delete(ACCT_PARAM.page)
	return u.toString()
}

export function toggleAccountBookingsStatus(
	current: AccountBookingsListParsed,
	status: OpsBookingsQueueStatusValue,
): AccountBookingsListParsed {
	const set = new Set(current.statuses)
	if (set.has(status)) set.delete(status)
	else set.add(status)
	return {
		...current,
		page: 1,
		statuses: uniqueSortedStatuses([...set]),
		selectedBookingId: null,
		epicPeriodThisMonth: false,
		epicStatusUpcoming: false,
	}
}

export function toggleAccountBookingsIntent(
	current: AccountBookingsListParsed,
	intent: OpsBookingIntentFilterValue,
): AccountBookingsListParsed {
	const set = new Set(current.intents)
	if (set.has(intent)) set.delete(intent)
	else set.add(intent)
	const order = [...OPS_BOOKINGS_QUEUE_INTENT_CHIP_VALUES]
	const intents = [...set].sort((a, b) => order.indexOf(a) - order.indexOf(b)) as OpsBookingIntentFilterValue[]
	return {
		...current,
		page: 1,
		intents,
		selectedBookingId: null,
		epicPeriodThisMonth: false,
		epicStatusUpcoming: false,
	}
}

export function flipAccountBookingsSort(current: AccountBookingsListParsed): AccountBookingsListParsed {
	const sort: AccountBookingsListSort = current.sort === 'pickup_asc' ? 'pickup_desc' : 'pickup_asc'
	return {
		...current,
		sort,
		page: 1,
		selectedBookingId: null,
		epicPeriodThisMonth: false,
		epicStatusUpcoming: false,
	}
}

/**
 * Apply `bookings.pickup_datetime` window predicates (active-account filters applied separately).
 * Typed loosely so callers can chain on `ReturnType<SupabaseClient['from']>` builders.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAccountBookingsPickupWindow(q: any, window: AccountBookingsTimeWindow): any {
	if (window === 'all') return q

	const now = new Date()
	const isoNow = now.toISOString()

	if (window === 'next_7d') {
		const end = new Date(now.getTime() + 7 * 86400000).toISOString()
		return q.gte('pickup_datetime', isoNow).lte('pickup_datetime', end)
	}
	if (window === 'next_30d') {
		const end = new Date(now.getTime() + 30 * 86400000).toISOString()
		return q.gte('pickup_datetime', isoNow).lte('pickup_datetime', end)
	}
	const start = new Date(now.getTime() - 90 * 86400000).toISOString()
	return q.gte('pickup_datetime', start).lt('pickup_datetime', isoNow)
}

/** Calendar month bounds on **`pickup_datetime`** (UTC month) — epic **`period=this_month`** deep link. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAccountBookingsThisMonthUtc(q: any): any {
	const now = new Date()
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
	const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
	return q.gte('pickup_datetime', start.toISOString()).lt('pickup_datetime', end.toISOString())
}

/**
 * Apply `bookings.booking_intent` filter (OR within selected intents; `_null` = IS NULL).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAccountBookingsIntentFilter(q: any, intents: OpsBookingIntentFilterValue[]): any {
	if (intents.length === 0) return q

	const hasNull = intents.includes('_null')
	const nonNull = intents.filter((i) => i !== '_null') as string[]

	if (hasNull && nonNull.length > 0) {
		return q.or(`booking_intent.is.null,booking_intent.in.(${nonNull.join(',')})`)
	}
	if (hasNull) {
		return q.is('booking_intent', null)
	}
	return q.in('booking_intent', nonNull)
}

function utcDayStartIso(yyyyMmDd: string): string {
	const [y, m, d] = yyyyMmDd.split('-').map((x) => Number.parseInt(x, 10))
	return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString()
}

function utcDayEndIso(yyyyMmDd: string): string {
	const [y, m, d] = yyyyMmDd.split('-').map((x) => Number.parseInt(x, 10))
	return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString()
}

/**
 * `pickup_datetime` within inclusive date range (UTC calendar days).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAccountBookingsDateRange(q: any, dateFrom: string | null, dateTo: string | null): any {
	let b = q
	if (dateFrom) {
		b = b.gte('pickup_datetime', utcDayStartIso(dateFrom))
	}
	if (dateTo) {
		b = b.lte('pickup_datetime', utcDayEndIso(dateTo))
	}
	return b
}

/** OR `ILIKE` on origin, destination, and payment ref (whitespace-prefixed terms). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAccountBookingsSearchOr(q: any, search: string | null | undefined): any {
	const s = (search ?? '').trim()
	if (s.length === 0) return q
	const p = escapeIlikePattern(s)
	const term = `%${p}%`
	return q.or(`origin_name.ilike.${term},destination_name.ilike.${term},payment_reference.ilike.${term}`)
}

/** OR of selected product intents (maps from {@link accountBookingsTripTypesToIntents}). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAccountBookingsTripTypeFilter(q: any, types: AccountBookingsTripTypeKey[]): any {
	if (types.length === 0) return q
	const intents = accountBookingsTripTypesToIntents(types)
	return q.in('booking_intent', intents)
}

export function toggleAccountBookingsTripType(
	current: AccountBookingsListParsed,
	key: AccountBookingsTripTypeKey,
): AccountBookingsListParsed {
	const set = new Set(current.tripTypes)
	if (set.has(key)) set.delete(key)
	else set.add(key)
	const order: AccountBookingsTripTypeKey[] = ['p2p', 'hourly', 'tour', 'cp']
	const tripTypes = order.filter((k) => set.has(k))
	return {
		...current,
		page: 1,
		tripTypes,
		selectedBookingId: null,
		epicPeriodThisMonth: false,
		epicStatusUpcoming: false,
	}
}

export const ACCOUNT_BOOKINGS_LIST_SELECT = `
  id,
  payment_reference,
  status,
  payment_status,
  booking_intent,
  customer_account_id,
  client_type,
  pickup_datetime,
  origin_name,
  destination_name,
  total_amount,
  created_at,
  booking_quotes!bookings_current_quote_id_fkey ( status, total_zar ),
  booking_trips (
    sort_order,
    trips (
      id,
      service_type
    )
  )
`

export type AccountBookingsListRow = {
	id: string
	payment_reference: string | null
	status: string | null
	payment_status: string | null
	booking_intent: string | null
	customer_account_id: string | null
	client_type: string | null
	pickup_datetime: string | null
	origin_name: string | null
	destination_name: string | null
	total_amount: number | null
	created_at: string
	booking_quotes?: unknown
	booking_trips: unknown
}

export { formatQueueStatusLabel }

/** Intent chip label — reuses ops “Standard / empty” for `_null`. */
export function formatAccountBookingsIntentChipLabel(value: OpsBookingIntentFilterValue): string {
	if (value === '_null') return 'Standard / empty'
	return formatBookingIntentLabel(value === '' ? null : value)
}
