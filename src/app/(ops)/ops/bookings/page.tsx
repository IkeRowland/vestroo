import Link from 'next/link'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

import { AccountQueueRowActions } from '@/features/ops/components/AccountQueueRowActions'
import { BookingsQueueTableRow } from '@/features/ops/components/BookingsQueueTableRow'
import { BookingsQueueStopNavCell } from '@/features/ops/components/bookings-queue-walk-in-actions-cell'
import { FulfilQueueRowActions } from '@/features/ops/components/FulfilQueueRowActions'
import { WalkInQueueRowActions } from '@/features/ops/components/WalkInQueueRowActions'
import { OpsAvatarCell } from '@/features/ops/components/OpsAvatarCell'
import { OpsBookingsQueuePresetChips } from '@/features/ops/components/OpsBookingsQueuePresetChips'
import { OpsBookingsRealtimeBridge } from '@/features/ops/components/OpsBookingsRealtimeBridge'
import { opsBookingsQueueCopy } from '@/features/ops/copy/ops-bookings-queue-copy'
import {
	getBookingsQueuePaymentPillTone,
	getBookingsQueueStatusPillTone,
} from '@/features/ops/lib/ops-bookings-queue-pill-tones'
import { OpsPagination } from '@/features/ops/components/OpsPagination'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { OpsNewBookingButton } from '@/features/ops/components/OpsNewBookingSheet'
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
	formatClientTypeLabel,
	formatQueueIntentFilterLabel,
	formatQueueStatusLabel,
	getIgnoredBookingsQueueParamKeys,
	hasActiveQueueFilters,
	isReadyToAssignPreset,
	OPS_BOOKINGS_QUEUE_NEEDS_ATTENTION_STATUSES,
	OPS_BOOKINGS_READY_TO_ASSIGN_STATUS,
	parseOpsBookingsQueueSearchParams,
	serializeOpsBookingsQueueSearchParams,
	type OpsBookingsQueueParsed,
} from '@/lib/ops-bookings-queue-query'
import { listActiveReferrersForOps } from '@/actions/referrerOps'
import { referrerLabelFromBookingEmbed } from '@/lib/referrer-types'
import {
	effectiveBookingStatusKeyForOps,
	extractFirstLinkedTripStatus,
	extractOpsBookingVehicleName,
} from '@/lib/ops-booking-detail'
import {
	matchesPaidBucket,
	matchesPendingBucket,
	tripRequestAcceptedAtFromMetadata,
} from '@/lib/fulfil-queue-buckets'
import {
	deriveAccountsQueueStageForBookingRow,
} from '@/lib/ops-accounts-queue-query'
import { opsFulfilAssignBookingHref } from '@/lib/ops-fulfil-nav'
import {
	deriveWalkInQueueStageForBookingRow,
	type OpsWalkInStageKey,
} from '@/lib/ops-walk-in-queue-query'
import type { PostgrestError } from '@supabase/supabase-js'
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
	total_amount: number | null
	availability_checked_at: string | null
	created_at: string
	/** PostgREST embed from `BOOKINGS_QUEUE_SELECT`. */
	customer_accounts?: unknown
	/** PostgREST may return object or array shapes for nested FKs — keep loose. */
	booking_trips: unknown
	/** `bookings.current_quote_id` → `booking_quotes` (Epic 14 / Story 14.4). */
	booking_quotes?: unknown
	/** `bookings.booking_metadata` — trip-request accept timestamp, etc. */
	booking_metadata?: unknown
	referrer_id?: string | null
	referrers?: unknown
}

const BOOKINGS_QUEUE_SELECT = `
  id, payment_reference, status, payment_status, booking_intent, client_type, customer_account_id,
  pickup_datetime, origin_name, destination_name, customer_name, customer_email,
  total_amount, availability_checked_at, created_at, booking_metadata, referrer_id,
  customer_accounts ( id, name ),
  referrers ( id, name, code ),
  booking_quotes!bookings_current_quote_id_fkey ( status, total_zar ),
  booking_trips (
    sort_order,
    trip_id,
    trips (
      status,
      vehicles ( name )
    )
  )
`

function bookingsQueueActionsCell(
	row: BookingsQueueRow,
	walkInStage: OpsWalkInStageKey | null,
	amountZar: number | null,
): ReactNode {
	if (walkInStage != null) {
		return (
			<WalkInQueueRowActions
				bookingId={row.id}
				activeStage={walkInStage}
				totalAmountZar={amountZar}
			/>
		)
	}
	if (row.client_type === 'account_client') {
		const accountStage = deriveAccountsQueueStageForBookingRow({
			client_type: row.client_type,
			status: row.status,
			availability_checked_at: row.availability_checked_at,
		})
		if (accountStage != null) {
			return (
				<AccountQueueRowActions
					bookingId={row.id}
					activeStage={accountStage}
					totalAmountZar={amountZar}
					dispatchGate={{ kind: 'unknown' }}
				/>
			)
		}
		return (
			<Button type="button" size="sm" variant="outline" asChild>
				<Link href={`/ops/bookings/${encodeURIComponent(row.id)}`}>Open booking</Link>
			</Button>
		)
	}
	const hasLink = extractFirstLinkedTripStatus(row.booking_trips) != null
	const bucketInput = {
		booking_intent: row.booking_intent,
		status: row.status,
		payment_status: row.payment_status,
		hasBookingTripLink: hasLink,
	}
	if (row.booking_intent === 'trip_request' && !matchesPaidBucket(bucketInput)) {
		const meta = row.booking_metadata as Record<string, unknown> | null | undefined
		return (
			<FulfilQueueRowActions
				queue="trip_request"
				bookingId={row.id}
				isCancelled={row.status === 'cancelled'}
				tripRequestAcceptedAt={tripRequestAcceptedAtFromMetadata(meta ?? null)}
			/>
		)
	}
	if (matchesPendingBucket(bucketInput)) {
		return (
			<FulfilQueueRowActions
				queue="pending"
				bookingId={row.id}
				isCancelled={row.status === 'cancelled'}
				tripRequestAcceptedAt={null}
			/>
		)
	}
	return <span className="text-xs text-ops-muted">—</span>
}

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

function bookingQueueCurrentQuoteEmbed(row: BookingsQueueRow): {
	status: string | null
	total_zar: number | null
} | null {
	const raw = row.booking_quotes
	if (!raw || typeof raw !== 'object') {
		return null
	}
	const obj = Array.isArray(raw)
		? (raw[0] as Record<string, unknown> | undefined)
		: (raw as Record<string, unknown>)
	if (!obj || typeof obj !== 'object') {
		return null
	}
	const status = obj.status
	const total_zar = obj.total_zar
	const st = typeof status === 'string' ? status : null
	let tz: number | null = null
	if (typeof total_zar === 'number' && Number.isFinite(total_zar)) {
		tz = total_zar
	} else if (typeof total_zar === 'string') {
		const n = Number(total_zar)
		tz = Number.isFinite(n) ? n : null
	}
	return { status: st, total_zar: tz }
}

/** Same rule as booking detail: current `booking_quotes` row total when valid, else `bookings.total_amount`. */
function queueRowDisplayTotalZar(row: BookingsQueueRow): number | null {
	const q = bookingQueueCurrentQuoteEmbed(row)
	if (q?.total_zar != null && Number.isFinite(q.total_zar)) {
		return q.total_zar
	}
	return row.total_amount
}

function currentQuoteIsRejectedFromRow(row: BookingsQueueRow): boolean {
	return bookingQueueCurrentQuoteEmbed(row)?.status === 'rejected'
}

/**
 * Apply URL queue filters to a **`bookings`** query. **Do not** chain this after a `select()` that
 * uses PostgREST embeds for **head count** queries — use `select('*', { count: 'exact', head: true })`
 * first so counts match the list (see `/ops/bookings` server handler).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyQueueFiltersToBookingsQuery(query: any, parsed: OpsBookingsQueueParsed) {
	let q = query
	if (parsed.statuses.length > 0) {
		q = q.in('status', parsed.statuses)
	}
	if (parsed.payments.length > 0) {
		q = q.in('payment_status', parsed.payments)
	}

	const hasNullIntent = parsed.intents.includes('_null')
	const concreteIntents = parsed.intents.filter((i): i is Exclude<OpsBookingIntentFilterValue, '_null' | ''> => i !== '_null' && i !== '')
	if (hasNullIntent && concreteIntents.length === 0) {
		q = q.is('booking_intent', null)
	} else if (!hasNullIntent && concreteIntents.length > 0) {
		q = q.in('booking_intent', concreteIntents)
	} else if (hasNullIntent && concreteIntents.length > 0) {
		q = q.or(
			`booking_intent.is.null,booking_intent.in.(${concreteIntents.join(',')})`,
		)
	}

	if (parsed.clients.length === 1) {
		q = q.eq('client_type', parsed.clients[0])
	} else if (parsed.clients.length > 1) {
		q = q.in('client_type', parsed.clients)
	}

	return q
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

	const supabase = await createUserServerClient()

	let totalCount = 0
	let computedTotalPages = 0
	let safePage = 1
	let rows: BookingsQueueRow[] = []
	let error: PostgrestError | null = null
	let rtaCountUnavailable = false
	let readyToAssignCount: number | null = null
	let needsAttentionUnavailable = false
	let needsAttentionCount: number | null = null
	let completedTotalUnavailable = false
	let completedTotalCount: number | null = null
	let cancelledUnavailable = false
	let cancelledCount: number | null = null
	let allBookingsUnavailable = false
	let allBookingsCount: number | null = null
	let paginationFilterQuery = ''
	let activeReferrers: Awaited<ReturnType<typeof listActiveReferrersForOps>> = []

	const perPage = parsed.perPage

	if (showMainQueue) {
		const filteredListBase = () =>
			applyQueueFiltersToBookingsQuery(
				supabase.from('bookings').select(BOOKINGS_QUEUE_SELECT),
				parsed,
			)
		const filteredCountBase = () =>
			applyQueueFiltersToBookingsQuery(
				supabase.from('bookings').select('*', { count: 'exact', head: true }),
				parsed,
			)

		const [
			countRes,
			rtaCountRes,
			needsAttentionRes,
			completedTotalRes,
			cancelledRes,
			allBookingsRes,
			referrersForForm,
		] = await Promise.all([
			filteredCountBase(),
			supabase
				.from('bookings')
				.select('*', { count: 'exact', head: true })
				.eq('status', OPS_BOOKINGS_READY_TO_ASSIGN_STATUS),
			supabase
				.from('bookings')
				.select('*', { count: 'exact', head: true })
				.in('status', [...OPS_BOOKINGS_QUEUE_NEEDS_ATTENTION_STATUSES]),
			supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
			supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
			supabase.from('bookings').select('*', { count: 'exact', head: true }),
			listActiveReferrersForOps(),
		])

		totalCount = countRes.error ? 0 : (countRes.count ?? 0)
		computedTotalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / perPage)
		safePage = Math.min(Math.max(1, parsed.page), Math.max(computedTotalPages, 1))

		const rangeFrom = (safePage - 1) * perPage
		const rangeTo = rangeFrom + perPage - 1
		const listRes = countRes.error
			? ({ data: null, error: countRes.error } as const)
			: await filteredListBase().order('created_at', { ascending: false }).range(rangeFrom, rangeTo)

		const { data, error: listError } = listRes
		error = listError ?? null
		rtaCountUnavailable = Boolean(rtaCountRes.error)
		readyToAssignCount = rtaCountUnavailable ? null : (rtaCountRes.count ?? 0)
		needsAttentionUnavailable = Boolean(needsAttentionRes.error)
		needsAttentionCount = needsAttentionUnavailable ? null : (needsAttentionRes.count ?? 0)
		completedTotalUnavailable = Boolean(completedTotalRes.error)
		completedTotalCount = completedTotalUnavailable ? null : (completedTotalRes.count ?? 0)
		cancelledUnavailable = Boolean(cancelledRes.error)
		cancelledCount = cancelledUnavailable ? null : (cancelledRes.count ?? 0)
		allBookingsUnavailable = Boolean(allBookingsRes.error)
		allBookingsCount = allBookingsUnavailable ? null : (allBookingsRes.count ?? 0)
		activeReferrers = referrersForForm

		rows = (data ?? []) as unknown as BookingsQueueRow[]
		paginationFilterQuery = serializeOpsBookingsQueueSearchParams(parsed)
	}

	const sliceDescription = describeFilterSliceForEmptyState(parsed)
	const isRtaPreset = isReadyToAssignPreset(parsed)

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader
				title="Bookings"
				description={
					showMainQueue
						? 'Unified bookings queue (newest first). Use advanced search or the filters below to narrow results.'
						: 'Advanced booking search is active — the main queue is hidden until you clear search filters.'
				}
			>
				{showMainQueue ? (
					<OpsNewBookingButton
						referrers={activeReferrers}
						bookingFormLoad={{
							bookSearchPrefill: null,
							portalRebookBootstrap: null,
							tripRequestPhoneCountryIso2Hint: 'za',
						}}
					/>
				) : null}
			</OpsPageHeader>

			<OpsBookingsRealtimeBridge />

			<OpsBookingsAdvancedSearch rawSearchParams={raw} queueFiltersAvailable={showMainQueue} />

			{showMainQueue ? (
				<>
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
					counts={{
						all: allBookingsCount,
						allUnavailable: allBookingsUnavailable,
						needsAttention: needsAttentionCount,
						needsAttentionUnavailable: needsAttentionUnavailable,
						readyToAssign: readyToAssignCount,
						readyToAssignUnavailable: rtaCountUnavailable,
						completed: completedTotalCount,
						completedUnavailable: completedTotalUnavailable,
						cancelled: cancelledCount,
						cancelledUnavailable: cancelledUnavailable,
					}}
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
								Client
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Referrer
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
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => {
							const refLabel = row.payment_reference ?? `${row.id.slice(0, 8)}…`
							const vehicle = extractOpsBookingVehicleName(row.booking_trips) ?? ''
							const walkInStage = deriveWalkInQueueStageForBookingRow({
								client_type: row.client_type,
								status: row.status,
								availability_checked_at: row.availability_checked_at,
								booking_trips: row.booking_trips,
							})
							const amountZar = queueRowDisplayTotalZar(row)
							const statusKeyForDisplay = effectiveBookingStatusKeyForOps(row.status, row.booking_trips)
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
									<td className="whitespace-nowrap px-3 py-2 text-sm text-ops-muted">
										{row.pickup_datetime
											? new Date(row.pickup_datetime).toLocaleString('en-ZA', {
													timeZone: 'UTC',
												})
											: '—'}
									</td>
									<td className="whitespace-nowrap px-3 py-2 text-sm tabular-nums text-ops-foreground">
										{formatZar(amountZar)}
									</td>
									<td className="px-3 py-2 text-sm">
										<div className="flex flex-wrap items-center gap-1.5">
											<OpsStatusPill tone={getBookingsQueueStatusPillTone(statusKeyForDisplay)}>
												{statusKeyForDisplay ? formatQueueStatusLabel(statusKeyForDisplay) : '—'}
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
									<td className="px-3 py-2 text-sm capitalize text-ops-muted">
										<OpsStatusPill tone="neutral" dot={false}>
											{formatClientTypeLabel(row.client_type)}
										</OpsStatusPill>
									</td>
									<td className="max-w-[10rem] px-3 py-2 text-sm text-ops-muted">
										{referrerLabelFromBookingEmbed(row.referrers)}
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
										{bookingsQueueActionsCell(row, walkInStage, amountZar)}
									</BookingsQueueStopNavCell>
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
