import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'

export const OPS_BOOKING_GRID_PAGE_SIZE = 25

/** Max page number (1-based); offset capped at `(MAX_PAGE - 1) * PAGE_SIZE`. */
export const OPS_BOOKING_GRID_MAX_PAGE = 200

/**
 * Query key prefix for advanced booking search on **`/ops/bookings`** — avoids colliding with queue
 * filters (`status`, `page`, `per`, …).
 */
export const OPS_BOOKINGS_ADVANCED_SEARCH_PREFIX = 'sq_' as const

export type OpsBookingGridParseOptions = {
	/** e.g. {@link OPS_BOOKINGS_ADVANCED_SEARCH_PREFIX} → reads `sq_q`, `sq_contact`, … */
	keyPrefix?: string
}

export type OpsBookingGridSerializeOptions = {
	keyPrefix?: string
}

export type OpsBookingGridSort =
	| 'created_desc'
	| 'pickup_asc'
	| 'pickup_desc'
	| 'ref_asc'

export const OPS_BOOKING_GRID_DEFAULT_SORT: OpsBookingGridSort = 'created_desc'

const SORT_WHITELIST: readonly OpsBookingGridSort[] = [
	'created_desc',
	'pickup_asc',
	'pickup_desc',
	'ref_asc',
] as const

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidShaped(value: string): boolean {
	return UUID_RE.test(value.trim())
}

function firstString(
	value: string | string[] | undefined,
): string | undefined {
	if (value === undefined) {
		return undefined
	}
	return Array.isArray(value) ? value[0] : value
}

function trimOrEmpty(value: string | undefined): string {
	return (value ?? '').trim()
}

function parseSort(raw: string | undefined): OpsBookingGridSort {
	const v = trimOrEmpty(raw) as OpsBookingGridSort
	if (SORT_WHITELIST.includes(v)) {
		return v
	}
	return OPS_BOOKING_GRID_DEFAULT_SORT
}

function parsePage(raw: string | undefined): number {
	const n = Number.parseInt(trimOrEmpty(raw) || '1', 10)
	if (!Number.isFinite(n) || n < 1) {
		return 1
	}
	return Math.min(n, OPS_BOOKING_GRID_MAX_PAGE)
}

function parseOptionalDate(raw: string | undefined): string | null {
	const s = trimOrEmpty(raw)
	if (!s) {
		return null
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
		return null
	}
	return s
}

/** Escape `%` and `_` for Postgres `ILIKE` (escape char `\\`). */
export function escapeIlikePattern(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export type OpsBookingIntentFilterValue =
	| ''
	| 'point_to_point'
	| 'hourly_hire'
	| 'corporate_pattern'
	| 'experience_package'
	| 'trip_request'
	| '_null'

const INTENT_FILTER_WHITELIST: readonly OpsBookingIntentFilterValue[] = [
	'',
	'point_to_point',
	'hourly_hire',
	'corporate_pattern',
	'experience_package',
	'trip_request',
	'_null',
] as const

function parseIntentFilter(raw: string | undefined): OpsBookingIntentFilterValue {
	const v = trimOrEmpty(raw) as OpsBookingIntentFilterValue
	if (INTENT_FILTER_WHITELIST.includes(v)) {
		return v
	}
	return ''
}

export type OpsBookingGridParsed = {
	q: string
	contact: string
	dateFrom: string | null
	dateTo: string | null
	status: string
	paymentStatus: string
	bookingIntent: OpsBookingIntentFilterValue
	sort: OpsBookingGridSort
	page: number
	pageSize: number
	/** True when any filter/sort param should drive a server query. */
	shouldQuery: boolean
}

function prefixedKey(prefix: string | undefined, base: string): string {
	const p = prefix ?? ''
	return p ? `${p}${base}` : base
}

/**
 * Pure parse of GET `searchParams` for the booking grid (legacy **`/ops/search`**, now **`/ops/bookings?sq_*`**).
 */
export function parseOpsBookingGridSearchParams(
	raw: Record<string, string | string[] | undefined>,
	options?: OpsBookingGridParseOptions,
): OpsBookingGridParsed {
	const pre = options?.keyPrefix ?? ''
	const q = trimOrEmpty(firstString(raw[prefixedKey(pre, 'q')]))
	const contact = trimOrEmpty(firstString(raw[prefixedKey(pre, 'contact')]))
	const dateFrom = parseOptionalDate(firstString(raw[prefixedKey(pre, 'date_from')]))
	const dateTo = parseOptionalDate(firstString(raw[prefixedKey(pre, 'date_to')]))
	const status = trimOrEmpty(firstString(raw[prefixedKey(pre, 'status')]))
	const paymentStatus = trimOrEmpty(firstString(raw[prefixedKey(pre, 'payment_status')]))
	const bookingIntent = parseIntentFilter(firstString(raw[prefixedKey(pre, 'booking_intent')]))
	const sort = parseSort(firstString(raw[prefixedKey(pre, 'sort')]))
	const page = parsePage(firstString(raw[prefixedKey(pre, 'page')]))

	const hasFilter =
		q.length > 0 ||
		contact.length > 0 ||
		dateFrom != null ||
		dateTo != null ||
		status.length > 0 ||
		paymentStatus.length > 0 ||
		bookingIntent.length > 0

	/** Avoid unbounded table scans: sort/pagination apply only when at least one filter is set. */
	const shouldQuery = hasFilter

	return {
		q,
		contact,
		dateFrom,
		dateTo,
		status,
		paymentStatus,
		bookingIntent,
		sort,
		page,
		pageSize: OPS_BOOKING_GRID_PAGE_SIZE,
		shouldQuery,
	}
}

export type OpsBookingGridOrderColumn = {
	column: string
	ascending: boolean
	nullsFirst?: boolean
}

/**
 * Primary sort column + mandatory `id` tie-breaker (stable ordering).
 */
export function opsBookingGridSortOrders(
	sort: OpsBookingGridSort,
): OpsBookingGridOrderColumn[] {
	switch (sort) {
		case 'pickup_asc':
			return [
				{ column: 'pickup_datetime', ascending: true, nullsFirst: false },
				{ column: 'id', ascending: true },
			]
		case 'pickup_desc':
			return [
				{ column: 'pickup_datetime', ascending: false, nullsFirst: true },
				{ column: 'id', ascending: false },
			]
		case 'ref_asc':
			return [
				{ column: 'payment_reference', ascending: true, nullsFirst: true },
				{ column: 'id', ascending: true },
			]
		case 'created_desc':
		default:
			return [
				{ column: 'created_at', ascending: false },
				{ column: 'id', ascending: false },
			]
	}
}

export function normalizeOpsBookingGridSortParam(
	raw: string | undefined,
): OpsBookingGridSort {
	return parseSort(raw)
}

export function isAllowedOpsBookingGridSort(
	value: string,
): value is OpsBookingGridSort {
	return (SORT_WHITELIST as readonly string[]).includes(value)
}

type OpsBookingGridSerializable = Pick<
	OpsBookingGridParsed,
	| 'q'
	| 'contact'
	| 'dateFrom'
	| 'dateTo'
	| 'status'
	| 'paymentStatus'
	| 'bookingIntent'
	| 'sort'
	| 'page'
>

/** Build GET query string for advanced booking search navigation (pagination, sort links). */
export function serializeOpsBookingGridSearchParams(
	p: OpsBookingGridSerializable,
	options?: OpsBookingGridSerializeOptions,
): string {
	const pre = options?.keyPrefix ?? ''
	const u = new URLSearchParams()
	const set = (base: string, value: string) => {
		u.set(prefixedKey(pre, base), value)
	}
	if (p.q) {
		set('q', p.q)
	}
	if (p.contact) {
		set('contact', p.contact)
	}
	if (p.dateFrom) {
		set('date_from', p.dateFrom)
	}
	if (p.dateTo) {
		set('date_to', p.dateTo)
	}
	if (p.status) {
		set('status', p.status)
	}
	if (p.paymentStatus) {
		set('payment_status', p.paymentStatus)
	}
	if (p.bookingIntent) {
		set('booking_intent', p.bookingIntent)
	}
	if (p.sort !== OPS_BOOKING_GRID_DEFAULT_SORT) {
		set('sort', p.sort)
	}
	if (p.page > 1) {
		set('page', String(p.page))
	}
	return u.toString()
}

/** Maps legacy **`/ops/search?…`** params onto **`/ops/bookings?sq_*…`**. */
export function remapLegacyOpsSearchToBookingsHref(
	raw: Record<string, string | string[] | undefined>,
): string {
	const u = new URLSearchParams()
	const carry = (legacyKey: string, targetBase: string) => {
		const v = trimOrEmpty(firstString(raw[legacyKey]))
		if (v) {
			u.set(prefixedKey(OPS_BOOKINGS_ADVANCED_SEARCH_PREFIX, targetBase), v)
		}
	}
	carry('q', 'q')
	carry('contact', 'contact')
	carry('email', 'contact')
	carry('phone', 'contact')
	carry('date_from', 'date_from')
	carry('date_to', 'date_to')
	carry('status', 'status')
	carry('payment_status', 'payment_status')
	carry('booking_intent', 'booking_intent')
	carry('sort', 'sort')
	carry('page', 'page')
	const qs = u.toString()
	return qs ? `${OPS_BOOKINGS_PATH}?${qs}` : OPS_BOOKINGS_PATH
}

/** Deep-link into advanced booking search on **`/ops/bookings`** (`sq_*` query keys). */
export function buildOpsBookingsAdvancedSearchHref(parts: {
	q?: string
	contact?: string
}): string {
	const u = new URLSearchParams()
	const pre = OPS_BOOKINGS_ADVANCED_SEARCH_PREFIX
	const q = parts.q?.trim()
	const c = parts.contact?.trim()
	if (q) {
		u.set(`${pre}q`, q)
	}
	if (c) {
		u.set(`${pre}contact`, c)
	}
	const qs = u.toString()
	return qs ? `${OPS_BOOKINGS_PATH}?${qs}` : OPS_BOOKINGS_PATH
}
