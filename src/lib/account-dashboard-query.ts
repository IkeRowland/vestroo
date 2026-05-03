import type { SupabaseClient } from '@supabase/supabase-js'

import { loadAccountInvoicesArchiveRows, type AccountInvoiceArchiveRow } from '@/lib/account-invoices-archive-query'
import {
	ACCOUNT_BOOKINGS_LIST_SELECT,
	ACCOUNT_DASHBOARD_UPCOMING_STATUSES,
	type AccountBookingsListRow,
} from '@/lib/account-bookings-list-query'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

export type AccountDashboardSnapshot = {
	tripsThisMonth: number
	upcomingTrips: number
	openInvoices: number | null
	activeMembers: number | null
	railTrips: AccountBookingsListRow[]
	/** Admin preview rows (may be empty). Invoice-archive failures do not populate **`errors`** — see **`invoicePreviewFailed`**. */
	recentInvoices: AccountInvoiceArchiveRow[]
	/** Invoice archive loader failed — show inline hint only (does not drive the top banner). */
	invoicePreviewFailed: boolean
	errors: string[]
}

function pushErr(bucket: string[], msg: string) {
	bucket.push(msg)
}

/** Epic deep-link targets from the dashboard KPI strip. */
export const ACCOUNT_DASHBOARD_HREFS = {
	tripsThisMonth: '/account/bookings?period=this_month',
	upcomingTrips: '/account/bookings?status=upcoming',
	openInvoices: '/account/invoices?status=open',
	members: '/account/members',
} as const

/**
 * Server snapshot for **`/account`** home (**FE.18.3**). **Admin-only** metrics are **`null`** for bookers
 * (callers must **omit** UI — **NFR.18.1**).
 */
export async function loadAccountDashboardSnapshot(
	supabase: SupabaseClient,
	accountId: string,
	role: CustomerAccountMemberRoleDb,
): Promise<AccountDashboardSnapshot> {
	const errors: string[] = []
	const isAdmin = role === 'admin'
	const now = new Date()
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
	const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
	const nowIso = now.toISOString()

	/** Head counts — **`select` must precede filters** (Supabase JS query builder). */
	const bookingsCountFiltered = () =>
		supabase
			.from('bookings')
			.select('*', { count: 'exact', head: true })
			.eq('customer_account_id', accountId)
			.eq('client_type', 'account_client')

	const tripsThisMonthP = bookingsCountFiltered()
		.gte('pickup_datetime', monthStart.toISOString())
		.lt('pickup_datetime', monthEnd.toISOString())

	const upcomingP = bookingsCountFiltered()
		.gte('pickup_datetime', nowIso)
		.in('status', [...ACCOUNT_DASHBOARD_UPCOMING_STATUSES])

	const railP = supabase
		.from('bookings')
		.select(ACCOUNT_BOOKINGS_LIST_SELECT)
		.eq('customer_account_id', accountId)
		.eq('client_type', 'account_client')
		.gte('pickup_datetime', nowIso)
		.in('status', [...ACCOUNT_DASHBOARD_UPCOMING_STATUSES])
		.order('pickup_datetime', { ascending: true, nullsFirst: false })
		.limit(6)

	const openInvoicesP = isAdmin
		? bookingsCountFiltered().in('status', ['ready_to_invoice', 'invoiced'])
		: Promise.resolve({ count: null, error: null } as const)

	const membersP = isAdmin
		? supabase
				.from('customer_account_members')
				.select('*', { count: 'exact', head: true })
				.eq('account_id', accountId)
				.not('accepted_at', 'is', null)
		: Promise.resolve({ count: null, error: null } as const)

	const invoiceArchiveP = isAdmin ? loadAccountInvoicesArchiveRows(supabase, accountId) : Promise.resolve(null)

	const [tripsMonthRes, upcomingRes, railRes, openInvRes, membersRes, archiveResult] = await Promise.all([
		tripsThisMonthP,
		upcomingP,
		railP,
		openInvoicesP,
		membersP,
		invoiceArchiveP,
	])

	if (tripsMonthRes.error) pushErr(errors, tripsMonthRes.error.message)
	if (upcomingRes.error) pushErr(errors, upcomingRes.error.message)
	if (railRes.error) pushErr(errors, railRes.error.message)
	if (isAdmin && openInvRes.error) pushErr(errors, openInvRes.error.message)
	if (isAdmin && membersRes.error) pushErr(errors, membersRes.error)

	const railTrips = (railRes.data ?? []) as AccountBookingsListRow[]

	let recentInvoices: AccountInvoiceArchiveRow[] = []
	let invoicePreviewFailed = false
	if (isAdmin && archiveResult) {
		if (archiveResult.error) {
			console.warn('[account-dashboard] invoice archive loader failed:', archiveResult.error)
			invoicePreviewFailed = true
		} else {
			recentInvoices = archiveResult.rows.slice(0, 5)
		}
	}

	return {
		tripsThisMonth: typeof tripsMonthRes.count === 'number' ? tripsMonthRes.count : 0,
		upcomingTrips: typeof upcomingRes.count === 'number' ? upcomingRes.count : 0,
		openInvoices: isAdmin && typeof openInvRes.count === 'number' ? openInvRes.count : null,
		activeMembers: isAdmin && typeof membersRes.count === 'number' ? membersRes.count : null,
		railTrips,
		recentInvoices,
		invoicePreviewFailed,
		errors,
	}
}

export function formatAccountDashboardLastSignIn(iso: string | null | undefined): string | null {
	if (!iso) return null
	const t = new Date(iso).getTime()
	if (Number.isNaN(t)) return null
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(t)
}
