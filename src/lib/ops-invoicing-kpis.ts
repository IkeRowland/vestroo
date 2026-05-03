import type { SupabaseClient } from '@supabase/supabase-js'

import {
	INVOICING_BOOKING_SELECT,
	mapBookingRecordToInvoicingRow,
	type OpsInvoicingQueueRow,
} from '@/lib/ops-invoicing-queue'

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null
}

/** Upper bound for scanning invoiced rows when computing overdue KPI (staff queue v1). */
export const OPS_INVOICING_OVERDUE_SCAN_LIMIT = 500

export type OpsInvoicingKpiSnapshot = {
	readyCount: number | null
	awaitingCount: number | null
	overdueCount: number | null
	overdueScanCapped: boolean
	readyError: boolean
	awaitingError: boolean
	overdueError: boolean
}

function utcTodayYmd(): string {
	const t = new Date()
	const y = t.getUTCFullYear()
	const m = String(t.getUTCMonth() + 1).padStart(2, '0')
	const d = String(t.getUTCDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

export function isInvoicingDueOverdue(dueDateYmd: string | null): boolean {
	if (!dueDateYmd) return false
	return dueDateYmd < utcTodayYmd()
}

/**
 * Read-only KPI aggregates for `/ops/invoicing` (Story 17.16). **RLS-respecting** head counts +
 * overdue derived from embedded trip + credit fields (same derivation as the queue mapper).
 */
export async function fetchInvoicingKpiSnapshot(
	supabase: SupabaseClient,
): Promise<OpsInvoicingKpiSnapshot> {
	const base = { client_type: 'account_client' as const }

	const [readyRes, awaitingRes] = await Promise.all([
		supabase
			.from('bookings')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'ready_to_invoice')
			.eq('client_type', base.client_type),
		supabase
			.from('bookings')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'invoiced')
			.eq('client_type', base.client_type),
	])

	const readyError = Boolean(readyRes.error)
	const awaitingError = Boolean(awaitingRes.error)
	const readyCount = readyError ? null : (readyRes.count ?? 0)
	const awaitingCount = awaitingError ? null : (awaitingRes.count ?? 0)

	let overdueCount: number | null = null
	let overdueScanCapped = false
	let overdueError = false

	if (awaitingError) {
		overdueCount = null
		overdueError = true
	} else {
		const { data, error } = await supabase
			.from('bookings')
			.select(INVOICING_BOOKING_SELECT)
			.eq('status', 'invoiced')
			.eq('client_type', base.client_type)
			.order('updated_at', { ascending: false })
			.limit(OPS_INVOICING_OVERDUE_SCAN_LIMIT)

		if (error) {
			overdueCount = null
			overdueError = true
		} else {
			const rawRows = data ?? []
			let overdue = 0
			const total = rawRows.length
			if (total >= OPS_INVOICING_OVERDUE_SCAN_LIMIT) {
				overdueScanCapped = true
			}
			for (const rec of rawRows) {
				if (!isRecord(rec)) continue
				const row = mapBookingRecordToInvoicingRow(rec)
				if (!row) continue
				if (isInvoicingDueOverdue(row.dueDateYmd)) {
					overdue += 1
				}
			}
			overdueCount = overdue
		}
	}

	return {
		readyCount,
		awaitingCount,
		overdueCount,
		overdueScanCapped,
		readyError,
		awaitingError,
		overdueError,
	}
}

/** Rows eligible for Overdue pill (same predicate as KPI overdue scan slice). */
export function invoicingRowIsOverdue(row: OpsInvoicingQueueRow): boolean {
	return isInvoicingDueOverdue(row.dueDateYmd)
}
