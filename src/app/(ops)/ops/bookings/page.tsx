import Link from 'next/link'

import { BookingsQueueRowSecondaryLinks } from '@/features/ops/components/BookingsQueueRowSecondaryLinks'
import { BookingsQueueTableRow } from '@/features/ops/components/BookingsQueueTableRow'
import { BookingsQueueStopNavCell } from '@/features/ops/components/bookings-queue-walk-in-actions-cell'
import { WalkInQueueRowActions } from '@/features/ops/components/WalkInQueueRowActions'
import { OpsAvatarCell } from '@/features/ops/components/OpsAvatarCell'
import { OpsBookingsQueuePresetChips } from '@/features/ops/components/OpsBookingsQueuePresetChips'
import { OpsBookingsRealtimeBridge } from '@/features/ops/components/OpsBookingsRealtimeBridge'
import { formatBookingIntentLabel } from '@/features/ops/booking-intent-labels'
import { opsBookingsQueueCopy } from '@/features/ops/copy/ops-bookings-queue-copy'
import {
	getBookingsQueuePaymentPillTone,
	getBookingsQueueStatusPillTone,
} from '@/features/ops/lib/ops-bookings-queue-pill-tones'
import { OpsPagination } from '@/features/ops/components/OpsPagination'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { OpsBookingsQueueOverviewBand } from '@/features/ops/components/OpsBookingsQueueOverviewBand'
import { OpsBookingsQueueFilters } from '@/features/ops/components/OpsBookingsQueueFilters'
import { OpsBookingsAdvancedSearch } from '@/features/ops/components/OpsBookingsAdvancedSearch'
import {
	OpsEmptyState,
	OpsPageHeader,
	OpsTableShell,
} from '@/features/ops/components/ops-primitives'
import {
	OPS_BOOKINGS_ADVANCED_SEARCH_PREFIX,
	parseOpsBookingGridSearchParams,
	type OpsBookingIntentFilterValue,
} from '@/lib/ops-booking-grid-query'
import {
	formatQueueIntentFilterLabel,
	formatQueueStatusLabel,
	getIgnoredBookingsQueueParamKeys,
	hasActiveQueueFilters,
	isReadyToAssignPreset,
	OPS_BOOKINGS_READY_TO_ASSIGN_HREF,
	OPS_BOOKINGS_READY_TO_ASSIGN_STATUS,
	parseOpsBookingsQueueSearchParams,
	serializeOpsBookingsQueueSearchParams,
	type OpsBookingsQueueParsed,
} from '@/lib/ops-bookings-queue-query'
import {
	buildBookingsQueueOverviewBarSeries,
	fetchBookingsQueueOverviewChartRows,
} from '@/lib/ops-bookings-queue-overview-chart'
import { opsFulfilAssignBookingHref } from '@/lib/ops-fulfil-nav'
import { opsBookingsAvailabilityCheckPageExists } from '@/lib/ops-bookings-availability-route'
import { deriveWalkInQueueStageForBookingRow } from '@/lib/ops-walk-in-queue-query'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

type BookingsQueueRow = {
	id: string
	payment_reference: string | null
	status: string | null
	payment_status: string | null
	booking_intent: string | null
	client_type: string | null
	customer_account_id: string | null
	pickup_datetime: string | null
	origin_name: string | null
	destination_name: string | null
	customer_name: string | null
	customer_email: string | null
	rider_name: string | null
	total_amount: number | null
	availability_checked_at: string | null
	created_at: string
	/** PostgREST embed from `BOOKINGS_QUEUE_SELECT`. */
	customer_accounts?: unknown
	/** PostgREST may return object or array shapes for nested FKs — keep loose. */
	booking_trips: unknown
	/** `bookings.current_quote_id` → `booking_quotes` (Epic 14 / Story 14.4). */
	booking_quotes?: unknown
}

const BOOKINGS_QUEUE_SELECT = `
  id, payment_reference, status, payment_status, booking_intent, client_type, customer_account_id,
  pickup_datetime, origin_name, destination_name, customer_name, customer_email, rider_name,
  total_amount, availability_checked_at, created_at,
  customer_accounts ( id, name ),
  booking_quotes!bookings_current_quote_id_fkey ( status ),
  booking_trips (
    trip_id,
    trips (
      vehicles ( name )
    )
  )
`

function truncateText(value: string | null, max: number): string {
	if (value == null || value === '') {
		return '—'
	}
	if (value.length <= max) {
		return value
	}
	return `${value.slice(0, max - 1)}…`
}

function formatRouteSummary(origin: string | null, dest: string | null): string {
	const o = truncateText(origin, 22)
	const d = truncateText(dest, 22)
	if (o === '—' && d === '—') {
		return '—'
	}
	return `${o} → ${d}`
}

function formatZar(amount: number | null): string {
	if (amount == null || Number.isNaN(amount)) {
		return '—'
	}
	return new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency: 'ZAR',
	}).format(amount)
}

function linkedAccountNameFromRow(row: BookingsQueueRow): string | null {
	const ca = row.customer_accounts as unknown
	if (!ca) {
		return null
	}
	if (Array.isArray(ca)) {
		const first = ca[0] as { name?: unknown } | undefined
		return typeof first?.name === 'string' ? first.name : null
	}
	if (typeof ca === 'object' && ca !== null && 'name' in ca) {
		const n = (ca as { name: unknown }).name
		return typeof n === 'string' ? n : null
	}
	return null
}

function vehiclePreviewFromRow(row: BookingsQueueRow): string {
	const bt = row.booking_trips
	if (!bt || !Array.isArray(bt) || bt.length === 0) {
		return ''
	}
	const firstBt = bt[0] as { trips?: unknown }
	const trips = firstBt?.trips
	const trip = Array.isArray(trips) ? trips[0] : trips
	if (!trip || typeof trip !== 'object') {
		return ''
	}
	const rawV = (trip as { vehicles?: unknown }).vehicles
	const veh = Array.isArray(rawV) ? rawV[0] : rawV
	if (!veh || typeof veh !== 'object' || veh === null) {
		return ''
	}
	const name = (veh as { name?: string | null }).name
	return typeof name === 'string' && name.trim() !== '' ? name.trim() : ''
}

function currentQuoteIsRejectedFromRow(row: BookingsQueueRow): boolean {
	const raw = row.booking_quotes
	if (!raw || typeof raw !== 'object') {
		return false
	}
	const obj = Array.isArray(raw) ? (raw[0] as { status?: unknown } | undefined) : (raw as { status?: unknown })
	const st = obj && typeof obj === 'object' && 'status' in obj ? (obj as { status: unknown }).status : undefined
	return st === 'rejected'
}

function applyQueueFiltersToQuery(
	supabase: SupabaseClient,
	parsed: OpsBookingsQueueParsed,
) {
	let query = supabase.from('bookings').select(BOOKINGS_QUEUE_SELECT)

	if (parsed.statuses.length > 0) {
		query = query.in('status', parsed.statuses)
	}
	if (parsed.payments.length > 0) {
		query = query.in('payment_status', parsed.payments)
	}

	const hasNullIntent = parsed.intents.includes('_null')
	const concreteIntents = parsed.intents.filter((i): i is Exclude<OpsBookingIntentFilterValue, '_null' | ''> => i !== '_null' && i !== '')
	if (hasNullIntent && concreteIntents.length === 0) {
		query = query.is('booking_intent', null)
	} else if (!hasNullIntent && concreteIntents.length > 0) {
		query = query.in('booking_intent', concreteIntents)
	} else if (hasNullIntent && concreteIntents.length > 0) {
		query = query.or(
			`booking_intent.is.null,booking_intent.in.(${concreteIntents.join(',')})`,
		)
	}

	if (parsed.clients.length === 1) {
		query = query.eq('client_type', parsed.clients[0])
	} else if (parsed.clients.length > 1) {
		query = query.in('client_type', parsed.clients)
	}

	return query
}

function describeFilterSliceForEmptyState(parsed: OpsBookingsQueueParsed): string | null {
	if (!hasActiveQueueFilters(parsed)) {
		return null
	}
	const bits: string[] = []
	if (parsed.statuses.length) {
		bits.push(
			`status: ${parsed.statuses.map((s) => formatQueueStatusLabel(s)).join(', ')}`,
		)
	}
	if (parsed.payments.length) {
		bits.push(`payment: ${parsed.payments.join(', ')}`)
	}
	if (parsed.intents.length) {
		bits.push(
			`intent: ${parsed.intents.map((i) => formatQueueIntentFilterLabel(i)).join(', ')}`,
		)
	}
	if (parsed.clients.length) {
		bits.push(`client: ${parsed.clients.join(', ')}`)
	}
	return bits.join(' · ')
}

function activeFiltersSummaryProse(parsed: OpsBookingsQueueParsed): string {
	if (!hasActiveQueueFilters(parsed)) {
		return 'Showing all bookings.'
	}
	const parts: string[] = []
	if (parsed.statuses.length) {
		parts.push(`${parsed.statuses.length} status filter(s)`)
	}
	if (parsed.payments.length) {
		parts.push(`${parsed.payments.length} payment filter(s)`)
	}
	if (parsed.intents.length) {
		parts.push(`${parsed.intents.length} intent filter(s)`)
	}
	if (parsed.clients.length) {
		parts.push(`${parsed.clients.length} client type filter(s)`)
	}
	return `Filtered: ${parts.join('; ')}.`
}

export default async function OpsBookingsPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const advancedParsed = parseOpsBookingGridSearchParams(raw, {
		keyPrefix: OPS_BOOKINGS_ADVANCED_SEARCH_PREFIX,
	})
	const showMainQueue = !advancedParsed.shouldQuery

	const parsed = parseOpsBookingsQueueSearchParams(raw)
	const ignoredParamKeys = getIgnoredBookingsQueueParamKeys(raw)
	const fetchedAtIso = new Date().toISOString()

	const supabase = await createUserServerClient()

	let totalCount = 0
	let computedTotalPages = 0
	let safePage = 1
	let rows: BookingsQueueRow[] = []
	let error: PostgrestError | null = null
	let rtaCountUnavailable = false
	let readyToAssignCount: number | null = null
	let completed7dUnavailable = false
	let completed7dCount = 0
	let barSeries = buildBookingsQueueOverviewBarSeries([])
	let paginationFilterQuery = ''

	const perPage = parsed.perPage

	if (showMainQueue) {
		const filteredBase = () => applyQueueFiltersToQuery(supabase, parsed)

		const completed7dFrom = (() => {
			const t = new Date()
			return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - 7))
		})()

		const [countRes, rtaCountRes, completed7dRes, chartRows] = await Promise.all([
			filteredBase().select('id', { count: 'exact', head: true }),
			supabase
				.from('bookings')
				.select('id', { count: 'exact', head: true })
				.eq('status', OPS_BOOKINGS_READY_TO_ASSIGN_STATUS),
			supabase
				.from('bookings')
				.select('id', { count: 'exact', head: true })
				.eq('status', 'completed')
				.gte('created_at', completed7dFrom.toISOString()),
			fetchBookingsQueueOverviewChartRows(supabase),
		])

		totalCount = countRes.error ? 0 : (countRes.count ?? 0)
		computedTotalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / perPage)
		safePage = Math.min(Math.max(1, parsed.page), Math.max(computedTotalPages, 1))

		const rangeFrom = (safePage - 1) * perPage
		const rangeTo = rangeFrom + perPage - 1
		const listRes = countRes.error
			? ({ data: null, error: countRes.error } as const)
			: await filteredBase().order('created_at', { ascending: false }).range(rangeFrom, rangeTo)

		const { data, error: listError } = listRes
		error = listError ?? null
		rtaCountUnavailable = Boolean(rtaCountRes.error)
		readyToAssignCount = rtaCountUnavailable ? null : (rtaCountRes.count ?? 0)
		completed7dUnavailable = Boolean(completed7dRes.error)
		completed7dCount = completed7dUnavailable ? 0 : (completed7dRes.count ?? 0)
		barSeries = buildBookingsQueueOverviewBarSeries(chartRows)

		rows = (data ?? []) as unknown as BookingsQueueRow[]
		paginationFilterQuery = serializeOpsBookingsQueueSearchParams(parsed)
	}

	const sliceDescription = describeFilterSliceForEmptyState(parsed)
	const isRtaPreset = isReadyToAssignPreset(parsed)
	const hasAvailabilityRoute = opsBookingsAvailabilityCheckPageExists()

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader
				title="Bookings"
				description={
					showMainQueue
						? 'Unified bookings queue (newest first). Use advanced search or the filters below to narrow results.'
						: 'Advanced booking search is active — the main queue is hidden until you clear search filters.'
				}
			/>

			<OpsDataFreshnessBar className="mt-0" fetchedAtIso={fetchedAtIso} />

			<OpsBookingsAdvancedSearch
				rawSearchParams={raw}
				fetchedAtIso={fetchedAtIso}
				showFreshnessBar={false}
			/>

			{showMainQueue ? (
				<>
					<OpsBookingsRealtimeBridge />

					<OpsBookingsQueueOverviewBand
				totalInView={totalCount}
				readyToAssign={readyToAssignCount}
				readyToAssignUnavailable={rtaCountUnavailable}
				completed7d={completed7dCount}
				completed7dUnavailable={completed7dUnavailable}
				barSeries={barSeries}
				readyToAssignDrillHref={OPS_BOOKINGS_READY_TO_ASSIGN_HREF}
			/>

			{ignoredParamKeys.length > 0 ? (
				<p
					className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-ops-foreground"
					role="status"
				>
					{opsBookingsQueueCopy.ignoredParamsStatus}
				</p>
			) : null}

			<p className="text-sm text-ops-muted" role="status">
				{activeFiltersSummaryProse(parsed)}
			</p>

			<div className="overflow-hidden rounded-lg border border-ops-border">
				<OpsBookingsQueuePresetChips
					parsed={parsed}
					readyToAssignCount={readyToAssignCount}
					readyToAssignCountUnavailable={rtaCountUnavailable}
				/>
				<OpsBookingsQueueFilters parsed={parsed} className="rounded-none border-0" />
			</div>

			{error ? (
				<OpsFetchErrorIsland title="Bookings could not be loaded" message={error.message} />
			) : null}

			{!error && rows.length === 0 ? (
				<OpsEmptyState
					title="No bookings match"
					description={
						isRtaPreset ? (
							<>
								No paid walk-in bookings are ready to assign right now.{' '}
								<Link
									href={OPS_BOOKINGS_PATH}
									className="text-primary underline-offset-2 hover:underline"
								>
									Clear the filter
								</Link>{' '}
								to see the full queue.
							</>
						) : sliceDescription ? (
							<>
								No bookings match the current filters ({sliceDescription}).{' '}
								<Link href={OPS_BOOKINGS_PATH} className="text-primary underline-offset-2 hover:underline">
									Clear all filters
								</Link>{' '}
								or adjust the filters above.
							</>
						) : (
							<>
								No bookings to show. Try{' '}
								<Link
									href={`${OPS_BOOKINGS_PATH}#ops-advanced-booking-search`}
									className="text-primary underline-offset-2 hover:underline"
								>
									advanced booking search
								</Link>{' '}
								above to look up a reference or contact.
							</>
						)
					}
				/>
			) : null}

			{!error && rows.length > 0 ? (
				<div className="space-y-4">
				<OpsTableShell caption={opsBookingsQueueCopy.tableCaption}>
					<thead className="border-b border-ops-border bg-ops-surface/60 text-ops-table-head text-xs uppercase tracking-wide text-ops-muted">
						<tr>
							<th scope="col" className="px-3 py-2 font-medium">
								Reference
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Customer
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Rider
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Email
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Pickup
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Amount
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Status
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Payment
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Intent
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Client
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Assignment
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Route
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Actions
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Other links
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => {
							const refLabel = row.payment_reference ?? `${row.id.slice(0, 8)}…`
							const vehicle = vehiclePreviewFromRow(row)
							const walkInStage = deriveWalkInQueueStageForBookingRow(row)
							return (
								<BookingsQueueTableRow
									key={row.id}
									bookingId={row.id}
									paymentReference={row.payment_reference}
									navigateHref={
										isRtaPreset ? opsFulfilAssignBookingHref(row.id) : undefined
									}
								>
									<td className="px-3 py-2 font-mono text-xs text-ops-foreground">{refLabel}</td>
									<td className="max-w-[14rem] px-3 py-2">
										<OpsAvatarCell
											src={null}
											name={
												row.customer_name?.trim()
													? truncateText(row.customer_name, 48)
													: 'Unknown'
											}
											secondary={
												row.customer_email?.trim()
													? truncateText(row.customer_email, 40)
													: linkedAccountNameFromRow(row)
											}
										/>
									</td>
									<td className="max-w-[10rem] truncate px-3 py-2 text-sm text-ops-muted">
										{truncateText(row.rider_name, 40)}
									</td>
									<td className="max-w-[12rem] truncate px-3 py-2 text-sm text-ops-muted">
										{truncateText(row.customer_email, 40)}
									</td>
									<td className="whitespace-nowrap px-3 py-2 text-sm text-ops-muted">
										{row.pickup_datetime
											? new Date(row.pickup_datetime).toLocaleString('en-ZA', {
													timeZone: 'UTC',
												})
											: '—'}
									</td>
									<td className="whitespace-nowrap px-3 py-2 text-sm tabular-nums text-ops-foreground">
										{formatZar(row.total_amount)}
									</td>
									<td className="px-3 py-2 text-sm">
										<div className="flex flex-wrap items-center gap-1.5">
											<OpsStatusPill tone={getBookingsQueueStatusPillTone(row.status)}>
												{row.status ? formatQueueStatusLabel(row.status) : '—'}
											</OpsStatusPill>
											{currentQuoteIsRejectedFromRow(row) ? (
												<OpsStatusPill tone="danger" dot={false}>
													Quote rejected
												</OpsStatusPill>
											) : null}
										</div>
									</td>
									<td className="px-3 py-2 text-sm">
										<OpsStatusPill tone={getBookingsQueuePaymentPillTone(row.payment_status)}>
											{row.payment_status
												? formatQueueStatusLabel(row.payment_status)
												: '—'}
										</OpsStatusPill>
									</td>
									<td className="px-3 py-2 text-sm text-ops-foreground">
										<OpsStatusPill tone="neutral" dot={false}>
											{formatBookingIntentLabel(row.booking_intent)}
										</OpsStatusPill>
									</td>
									<td className="px-3 py-2 text-sm capitalize text-ops-muted">
										<OpsStatusPill tone="neutral" dot={false}>
											{row.client_type ? formatQueueStatusLabel(row.client_type) : '—'}
										</OpsStatusPill>
									</td>
									<td className="max-w-[10rem] px-3 py-2 text-sm text-ops-muted">
										{vehicle ? (
											<span title={vehicle}>{truncateText(vehicle, 28)}</span>
										) : (
											<span className="text-ops-muted/90 italic">Not yet assigned</span>
										)}
									</td>
									<td className="max-w-[14rem] px-3 py-2 text-sm text-ops-muted">
										{formatRouteSummary(row.origin_name, row.destination_name)}
									</td>
									<BookingsQueueStopNavCell>
										{walkInStage != null ? (
											<WalkInQueueRowActions
												bookingId={row.id}
												activeStage={walkInStage}
												hasAvailabilityRoute={hasAvailabilityRoute}
												totalAmountZar={row.total_amount}
											/>
										) : (
											<span className="text-xs text-ops-muted">—</span>
										)}
									</BookingsQueueStopNavCell>
									<td className="px-3 py-2">
										<BookingsQueueRowSecondaryLinks
											bookingId={row.id}
											paymentStatus={row.payment_status}
											clientType={row.client_type}
											linkedAccountName={linkedAccountNameFromRow(row)}
										/>
									</td>
								</BookingsQueueTableRow>
							)
						})}
					</tbody>
				</OpsTableShell>
				<OpsPagination
					pathname={OPS_BOOKINGS_PATH}
					query={paginationFilterQuery}
					currentPage={safePage}
					totalPages={computedTotalPages}
					totalCount={totalCount}
					perPage={perPage}
				/>
				</div>
			) : null}
				</>
			) : null}
		</div>
	)
}
