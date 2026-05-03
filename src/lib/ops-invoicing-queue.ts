import type { SupabaseClient } from '@supabase/supabase-js'

import type { AccountSnapshotJsonDb } from '@/types/database.types'

/** Max rows per invoicing tab (staff queue v1). */
export const OPS_INVOICING_QUEUE_LIMIT = 150

export type OpsInvoicingTabId = 'ready' | 'invoiced' | 'hooks'

export type OpsInvoicingSortKey =
	| 'due_date'
	| 'booking_reference'
	| 'customer_account'
	| 'total_amount'
	| 'trip_completed_at'
	| 'purchase_order_ref'
	| 'credit_terms_days'

export type OpsInvoicingQueueRow = {
	bookingId: string
	/** Human-facing reference: `payment_reference` when set, else booking UUID. */
	bookingReference: string
	customerAccountDisplayName: string
	totalAmount: number | null
	tripCompletedAtIso: string | null
	purchaseOrderRef: string | null
	creditTermsDays: number
	/** Calendar due date `YYYY-MM-DD` (UTC) — see story Progress Notes. */
	dueDateYmd: string | null
	externalInvoiceRef: string | null
}

/** Shared by `/ops/invoicing` and **15C.7** invoice-due reminder cron (account scope + trip embed). */
export const INVOICING_BOOKING_SELECT = `
	id,
	payment_reference,
	status,
	total_amount,
	purchase_order_ref,
	account_snapshot,
	customer_account_id,
	client_type,
	customer_email,
	customer_id,
	rider_email,
	external_invoice_ref,
	customer_accounts ( id, name, credit_terms_days ),
	booking_trips (
		trips ( id, status, status_history, updated_at )
	)
`

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null
}

/**
 * Latest `completed` transition time from `trips.status_history`, else `updated_at` when status is `completed`.
 * Aligns with Epic 13.9 (trip completion drives `ready_to_invoice`) using linked `booking_trips` → `trips`.
 */
/** Resolves latest linked trip completion ISO timestamp for invoicing display. */
export function tripCompletedAtIsoFromBookingTripsEmbed(bookingTrips: unknown): string | null {
	if (!Array.isArray(bookingTrips) || bookingTrips.length === 0) {
		return null
	}
	let bestMs = -Infinity
	let bestIso: string | null = null

	for (const link of bookingTrips) {
		if (!isRecord(link)) continue
		const rawTrips = link.trips
		const tripObj = Array.isArray(rawTrips) ? rawTrips[0] : rawTrips
		if (!isRecord(tripObj)) continue
		const status = typeof tripObj.status === 'string' ? tripObj.status : ''
		if (status !== 'completed') continue

		let completedAt: string | null = null
		const hist = tripObj.status_history
		if (Array.isArray(hist)) {
			for (const entry of hist) {
				if (!isRecord(entry)) continue
				if (entry.to !== 'completed') continue
				const at = entry.at
				if (typeof at === 'string') {
					completedAt = at
				}
			}
		}
		if (!completedAt && typeof tripObj.updated_at === 'string') {
			completedAt = tripObj.updated_at
		}
		if (!completedAt) continue
		const ms = Date.parse(completedAt)
		if (!Number.isNaN(ms) && ms >= bestMs) {
			bestMs = ms
			bestIso = completedAt
		}
	}
	return bestIso
}

function snapshotFromRow(raw: unknown): AccountSnapshotJsonDb | null {
	if (!isRecord(raw)) return null
	const name = raw.name
	const credit = raw.credit_terms_days
	const out: AccountSnapshotJsonDb = {}
	if (typeof name === 'string') out.name = name
	if (typeof credit === 'number' && Number.isFinite(credit)) {
		out.credit_terms_days = credit
	}
	if (Object.keys(out).length === 0) return null
	return out
}

function customerAccountFromEmbed(raw: unknown): { name: string | null; creditTermsDays: number | null } {
	if (!raw) {
		return { name: null, creditTermsDays: null }
	}
	const row = Array.isArray(raw) ? raw[0] : raw
	if (!isRecord(row)) {
		return { name: null, creditTermsDays: null }
	}
	const name = typeof row.name === 'string' ? row.name : null
	const c = row.credit_terms_days
	const creditTermsDays = typeof c === 'number' && Number.isFinite(c) ? c : null
	return { name, creditTermsDays }
}

export function creditTermsDaysForInvoicingRow(
	accountSnapshot: unknown,
	customerAccountsEmbed: unknown,
): number {
	const snap = snapshotFromRow(accountSnapshot)
	if (typeof snap?.credit_terms_days === 'number' && Number.isFinite(snap.credit_terms_days)) {
		return Math.max(0, Math.floor(snap.credit_terms_days))
	}
	const ca = customerAccountFromEmbed(customerAccountsEmbed)
	if (typeof ca.creditTermsDays === 'number' && Number.isFinite(ca.creditTermsDays)) {
		return Math.max(0, Math.floor(ca.creditTermsDays))
	}
	return 0
}

export function customerAccountDisplayNameForRow(
	accountSnapshot: unknown,
	customerAccountsEmbed: unknown,
): string {
	const snap = snapshotFromRow(accountSnapshot)
	if (typeof snap?.name === 'string' && snap.name.trim() !== '') {
		return snap.name.trim()
	}
	const ca = customerAccountFromEmbed(customerAccountsEmbed)
	if (typeof ca.name === 'string' && ca.name.trim() !== '') {
		return ca.name.trim()
	}
	return '—'
}

export function bookingReferenceFromRow(paymentReference: string | null, bookingId: string): string {
	if (typeof paymentReference === 'string' && paymentReference.trim() !== '') {
		return paymentReference.trim()
	}
	return bookingId
}

/**
 * Due date = trip completion (UTC calendar date) + N whole calendar days in UTC (end-of-day not used; date-only).
 */
/** Computes invoice due calendar date (`YYYY-MM-DD`, UTC) from trip completion and credit terms. */
export function dueDateYmdFromTripCompletedAndCreditDays(
	tripCompletedAtIso: string | null,
	creditTermsDays: number,
): string | null {
	if (!tripCompletedAtIso) return null
	const start = Date.parse(tripCompletedAtIso)
	if (Number.isNaN(start)) return null
	const base = new Date(start)
	const y = base.getUTCFullYear()
	const mo = base.getUTCMonth()
	const d = base.getUTCDate()
	const due = new Date(Date.UTC(y, mo, d + Math.max(0, creditTermsDays), 0, 0, 0, 0))
	const yy = due.getUTCFullYear()
	const mm = String(due.getUTCMonth() + 1).padStart(2, '0')
	const dd = String(due.getUTCDate()).padStart(2, '0')
	return `${yy}-${mm}-${dd}`
}

export function mapBookingRecordToInvoicingRow(record: Record<string, unknown>): OpsInvoicingQueueRow | null {
	const id = record.id
	if (typeof id !== 'string') return null
	const paymentRef = record.payment_reference
	const paymentReference = typeof paymentRef === 'string' || paymentRef === null ? paymentRef : null
	const totalRaw = record.total_amount
	const totalAmount = typeof totalRaw === 'number' && Number.isFinite(totalRaw) ? totalRaw : null
	const po = record.purchase_order_ref
	const purchaseOrderRef = typeof po === 'string' || po === null ? (po as string | null) : null
	const ext = record.external_invoice_ref
	const externalInvoiceRef =
		typeof ext === 'string' || ext === null ? (ext as string | null) : null

	const tripIso = tripCompletedAtIsoFromBookingTripsEmbed(record.booking_trips)
	const creditTermsDays = creditTermsDaysForInvoicingRow(record.account_snapshot, record.customer_accounts)
	const dueDateYmd = dueDateYmdFromTripCompletedAndCreditDays(tripIso, creditTermsDays)

	return {
		bookingId: id,
		bookingReference: bookingReferenceFromRow(paymentReference, id),
		customerAccountDisplayName: customerAccountDisplayNameForRow(
			record.account_snapshot,
			record.customer_accounts,
		),
		totalAmount,
		tripCompletedAtIso: tripIso,
		purchaseOrderRef,
		creditTermsDays,
		dueDateYmd,
		externalInvoiceRef,
	}
}

export function sortInvoicingQueueRows(
	rows: OpsInvoicingQueueRow[],
	key: OpsInvoicingSortKey,
	direction: 'asc' | 'desc',
): OpsInvoicingQueueRow[] {
	const mul = direction === 'asc' ? 1 : -1
	const sorted = [...rows]
	sorted.sort((a, b) => {
		const cmpNullLast = (va: string | null | undefined, vb: string | null | undefined): number => {
			if (va == null && vb == null) return 0
			if (va == null) return 1
			if (vb == null) return -1
			if (va < vb) return -1 * mul
			if (va > vb) return 1 * mul
			return 0
		}
		const cmpNum = (va: number | null, vb: number | null): number => {
			if (va == null && vb == null) return 0
			if (va == null) return 1
			if (vb == null) return -1
			if (va < vb) return -1 * mul
			if (va > vb) return 1 * mul
			return 0
		}
		switch (key) {
			case 'due_date':
				return cmpNullLast(a.dueDateYmd, b.dueDateYmd)
			case 'booking_reference':
				return cmpNullLast(a.bookingReference, b.bookingReference)
			case 'customer_account':
				return cmpNullLast(a.customerAccountDisplayName, b.customerAccountDisplayName)
			case 'total_amount':
				return cmpNum(a.totalAmount, b.totalAmount)
			case 'trip_completed_at':
				return cmpNullLast(a.tripCompletedAtIso, b.tripCompletedAtIso)
			case 'purchase_order_ref':
				return cmpNullLast(a.purchaseOrderRef, b.purchaseOrderRef)
			case 'credit_terms_days':
				return cmpNum(a.creditTermsDays, b.creditTermsDays)
			default:
				return 0
		}
	})
	return sorted
}

/** Stable CSV column order for handoff (headers match export). */
export const OPS_INVOICING_CSV_HEADERS = [
	'booking_reference',
	'customer_account',
	'total_amount',
	'trip_completed_at',
	'purchase_order_ref',
	'credit_terms_days',
	'due_date',
	'external_invoice_ref',
	'booking_id',
] as const

export function escapeCsvCell(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

export function invoicingQueueRowToCsvLine(row: OpsInvoicingQueueRow): string {
	const cells: string[] = [
		row.bookingReference,
		row.customerAccountDisplayName,
		row.totalAmount == null ? '' : String(row.totalAmount),
		row.tripCompletedAtIso ?? '',
		row.purchaseOrderRef ?? '',
		String(row.creditTermsDays),
		row.dueDateYmd ?? '',
		row.externalInvoiceRef ?? '',
		row.bookingId,
	]
	return cells.map(escapeCsvCell).join(',')
}

export function buildInvoicingQueueCsv(rows: OpsInvoicingQueueRow[]): string {
	const headerLine = OPS_INVOICING_CSV_HEADERS.map(escapeCsvCell).join(',')
	const lines = rows.map(invoicingQueueRowToCsvLine)
	return [headerLine, ...lines].join('\n')
}

export function parseOpsInvoicingTabParam(raw: string | string[] | undefined): OpsInvoicingTabId {
	const v = Array.isArray(raw) ? raw[0] : raw
	if (v === 'invoiced' || v === 'hooks') return v
	return 'ready'
}

/** Loads account-client bookings for an invoicing tab; default-sorts by due date ascending (nulls last). */
export async function fetchInvoicingQueueBookings(
	supabase: SupabaseClient,
	status: 'ready_to_invoice' | 'invoiced',
): Promise<{ rows: OpsInvoicingQueueRow[]; errorMessage: string | null }> {
	const { data, error } = await supabase
		.from('bookings')
		.select(INVOICING_BOOKING_SELECT)
		.eq('status', status)
		.eq('client_type', 'account_client')
		.order('updated_at', { ascending: false })
		.limit(OPS_INVOICING_QUEUE_LIMIT)

	if (error) {
		return { rows: [], errorMessage: error.message }
	}

	const rawRows = data ?? []
	const mapped: OpsInvoicingQueueRow[] = []
	for (const rec of rawRows) {
		if (!isRecord(rec)) continue
		const row = mapBookingRecordToInvoicingRow(rec)
		if (row) mapped.push(row)
	}
	// Default presentation: soonest due first (nulls last).
	const sorted = sortInvoicingQueueRows(mapped, 'due_date', 'asc')
	return { rows: sorted, errorMessage: null }
}
