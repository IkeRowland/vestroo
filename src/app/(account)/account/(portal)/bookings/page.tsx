import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AccountBookingsPageShell } from '@/features/account/components/AccountBookingsPageShell'
import { accountBookingsPageCopy } from '@/features/account/copy/account-bookings-copy'
import { accountPortalBookingDetailPath } from '@/lib/account-portal-booking-path'
import {
	ACCOUNT_BOOKINGS_LIST_PAGE_SIZE,
	ACCOUNT_BOOKINGS_LIST_SELECT,
	ACCOUNT_DASHBOARD_UPCOMING_STATUSES,
	applyAccountBookingsDateRange,
	applyAccountBookingsIntentFilter,
	applyAccountBookingsPickupWindow,
	applyAccountBookingsSearchOr,
	applyAccountBookingsThisMonthUtc,
	applyAccountBookingsTripTypeFilter,
	hasAccountBookingsCustomDateRange,
	parseAccountBookingsListSearchParams,
	type AccountBookingsListRow,
} from '@/lib/account-bookings-list-query'
import { getActiveMembershipRole, requireAccountMemberPage } from '@/lib/account-portal-auth'
import { loadVerifiedPortalBootstrapForAccount } from '@/lib/book-again-portal-handoff.server'
import { parseBookingSearchUrlParams } from '@/lib/booking-search-url-params'
import { createUserServerClient } from '@/lib/supabase/server'
import { getTripRequestPhoneCountryIso2FromHeaders } from '@/lib/trip-request-phone-country-hint.server'
import { pickFirstSearchParam } from '@/lib/url-search-params'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountBookingsPage({ searchParams }: PageProps) {
	const session = await requireAccountMemberPage()
	const portalRole = getActiveMembershipRole(session)
	if (!portalRole) {
		throw new Error('Active account is not in membership list')
	}
	const raw = await searchParams
	const parsed = parseAccountBookingsListSearchParams(raw)
	const hasDate = hasAccountBookingsCustomDateRange(parsed)

	const { bookSearchPrefill } = parseBookingSearchUrlParams({
		tab: pickFirstSearchParam(raw, 'tab'),
		modify: pickFirstSearchParam(raw, 'modify'),
		originHint: pickFirstSearchParam(raw, 'originHint'),
		destinationHint: pickFirstSearchParam(raw, 'destinationHint'),
		passengers: pickFirstSearchParam(raw, 'passengers'),
		intent: pickFirstSearchParam(raw, 'intent'),
		serviceTypeHint: pickFirstSearchParam(raw, 'serviceTypeHint'),
		omitTripDate: pickFirstSearchParam(raw, 'omitTripDate'),
	})
	const portalRebookBootstrap = await loadVerifiedPortalBootstrapForAccount(session.activeAccountId)
	const tripRequestPhoneCountryIso2Hint = await getTripRequestPhoneCountryIso2FromHeaders()

	const supabase = await createUserServerClient()
	const activeAccountId = session.activeAccountId

	let q = supabase
		.from('bookings')
		.select(ACCOUNT_BOOKINGS_LIST_SELECT, { count: 'exact' })
		.eq('customer_account_id', activeAccountId)
		.eq('client_type', 'account_client')

	if (hasDate) {
		q = applyAccountBookingsDateRange(q, parsed.dateFrom, parsed.dateTo)
	} else if (parsed.epicPeriodThisMonth) {
		q = applyAccountBookingsThisMonthUtc(q)
	} else {
		q = applyAccountBookingsPickupWindow(q, parsed.window)
	}

	if (parsed.epicStatusUpcoming) {
		const nowIso = new Date().toISOString()
		q = q.gte('pickup_datetime', nowIso).in('status', [...ACCOUNT_DASHBOARD_UPCOMING_STATUSES])
	} else if (parsed.statuses.length > 0) {
		q = q.in('status', parsed.statuses)
	}

	if (parsed.tripTypes.length > 0) {
		q = applyAccountBookingsTripTypeFilter(q, parsed.tripTypes)
	} else {
		q = applyAccountBookingsIntentFilter(q, parsed.intents)
	}

	if (parsed.search.trim() !== '') {
		q = applyAccountBookingsSearchOr(q, parsed.search)
	}

	const ascending = parsed.sort === 'pickup_asc'
	const from = (parsed.page - 1) * ACCOUNT_BOOKINGS_LIST_PAGE_SIZE
	const to = from + ACCOUNT_BOOKINGS_LIST_PAGE_SIZE - 1

	const { data, error, count } = await q
		.order('pickup_datetime', { ascending, nullsFirst: false })
		.range(from, to)

	const rows = (data ?? []) as AccountBookingsListRow[]
	const total = typeof count === 'number' ? count : rows.length

	if (parsed.selectedBookingId) {
		redirect(accountPortalBookingDetailPath(parsed.selectedBookingId))
	}

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-account-foreground">
						{accountBookingsPageCopy.pageTitle}
					</h1>
					<p className="mt-1 text-sm text-account-muted">
						{session.activeAccount.name} — {accountBookingsPageCopy.pageSubtitle}
					</p>
				</div>
				<Link
					href="/account"
					className="text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					{accountBookingsPageCopy.backToAccount}
				</Link>
			</div>

			{error ? (
				<div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
					{accountBookingsPageCopy.loadError(String(error.message))}
				</div>
			) : null}

			<AccountBookingsPageShell
				parsed={parsed}
				rows={rows}
				total={total}
				bookingFormLoad={{
					bookSearchPrefill,
					portalRebookBootstrap,
					tripRequestPhoneCountryIso2Hint,
				}}
			/>
		</div>
	)
}
