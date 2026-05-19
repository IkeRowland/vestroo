import Link from 'next/link'

import { formatBookingIntentLabel } from '@/features/ops/booking-intent-labels'
import { OpsAdvancedBookingSearchFiltersCollapsible } from '@/features/ops/components/OpsAdvancedBookingSearchFiltersCollapsible'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import {
	OpsEmptyState,
	OpsFilterRow,
	OpsTableShell,
} from '@/features/ops/components/ops-primitives'
import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import {
	escapeIlikePattern,
	isUuidShaped,
	OPS_BOOKINGS_ADVANCED_SEARCH_PREFIX,
	opsBookingGridSortOrders,
	OPS_BOOKING_GRID_MAX_PAGE,
	OPS_BOOKING_GRID_PAGE_SIZE,
	parseOpsBookingGridSearchParams,
	serializeOpsBookingGridSearchParams,
	type OpsBookingGridParsed,
	type OpsBookingGridSort,
} from '@/lib/ops-booking-grid-query'
import { createUserServerClient } from '@/lib/supabase/server'

const PREFIX = OPS_BOOKINGS_ADVANCED_SEARCH_PREFIX

type BookingGridRow = {
	id: string
	payment_reference: string | null
	status: string | null
	payment_status: string | null
	booking_intent: string | null
	pickup_datetime: string | null
	origin_name: string | null
	destination_name: string | null
	customer_name: string | null
	created_at: string
}

function gridHref(
	parsed: OpsBookingGridParsed,
	overrides: Partial<Pick<OpsBookingGridParsed, 'page' | 'sort'>>,
): string {
	const next = { ...parsed, ...overrides }
	const qs = serializeOpsBookingGridSearchParams(next, { keyPrefix: PREFIX })
	return qs.length > 0 ? `${OPS_BOOKINGS_PATH}?${qs}` : OPS_BOOKINGS_PATH
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

const STATUS_OPTIONS = ['pending', 'paid', 'cancelled'] as const

const PAYMENT_STATUS_OPTIONS = ['pending', 'paid', 'processing', 'failed'] as const

const INTENT_OPTIONS: { value: string; label: string }[] = [
	{ value: '', label: 'Any intent' },
	{ value: '_null', label: 'Standard (null)' },
	{ value: 'point_to_point', label: formatBookingIntentLabel('point_to_point') },
	{ value: 'hourly_hire', label: formatBookingIntentLabel('hourly_hire') },
	{
		value: 'corporate_pattern',
		label: formatBookingIntentLabel('corporate_pattern'),
	},
	{
		value: 'experience_package',
		label: formatBookingIntentLabel('experience_package'),
	},
	{ value: 'trip_request', label: formatBookingIntentLabel('trip_request') },
]

const SORT_LINKS: { sort: OpsBookingGridSort; label: string }[] = [
	{ sort: 'created_desc', label: 'Created (newest)' },
	{ sort: 'pickup_asc', label: 'Pickup (earliest)' },
	{ sort: 'pickup_desc', label: 'Pickup (latest)' },
	{ sort: 'ref_asc', label: 'Reference (A–Z)' },
]

type Props = {
	rawSearchParams: Record<string, string | string[] | undefined>
	/** When false (advanced-only view), empty-state copy omits main-queue filters. */
	queueFiltersAvailable?: boolean
}

export async function OpsBookingsAdvancedSearch({
	rawSearchParams,
	queueFiltersAvailable = true,
}: Props) {
	const parsed = parseOpsBookingGridSearchParams(rawSearchParams, { keyPrefix: PREFIX })

	let rows: BookingGridRow[] = []
	let totalCount: number | null = null
	let loadError: { message: string } | null = null

	if (parsed.shouldQuery) {
		const supabase = await createUserServerClient()
		let bookingsQuery = supabase
			.from('bookings')
			.select(
				'id, payment_reference, status, payment_status, booking_intent, pickup_datetime, origin_name, destination_name, customer_name, created_at',
				{ count: 'exact' },
			)

		if (parsed.q) {
			const esc = escapeIlikePattern(parsed.q)
			const pattern = `%${esc}%`
			const trimmed = parsed.q.trim()
			if (isUuidShaped(trimmed)) {
				const safePattern = `%${esc.replace(/,/g, '')}%`
				bookingsQuery = bookingsQuery.or(
					`id.eq.${trimmed},payment_reference.ilike.${safePattern}`,
				)
			} else {
				bookingsQuery = bookingsQuery.ilike('payment_reference', pattern)
			}
		}

		if (parsed.contact) {
			const esc = escapeIlikePattern(parsed.contact).replace(/,/g, '')
			const pattern = `%${esc}%`
			bookingsQuery = bookingsQuery.or(
				`customer_phone.ilike.${pattern},customer_email.ilike.${pattern}`,
			)
		}

		if (parsed.dateFrom) {
			bookingsQuery = bookingsQuery.gte(
				'pickup_datetime',
				`${parsed.dateFrom}T00:00:00.000Z`,
			)
		}
		if (parsed.dateTo) {
			bookingsQuery = bookingsQuery.lte(
				'pickup_datetime',
				`${parsed.dateTo}T23:59:59.999Z`,
			)
		}
		if (parsed.status) {
			bookingsQuery = bookingsQuery.eq('status', parsed.status)
		}
		if (parsed.paymentStatus) {
			bookingsQuery = bookingsQuery.eq('payment_status', parsed.paymentStatus)
		}
		if (parsed.bookingIntent === '_null') {
			bookingsQuery = bookingsQuery.is('booking_intent', null)
		} else if (parsed.bookingIntent) {
			bookingsQuery = bookingsQuery.eq('booking_intent', parsed.bookingIntent)
		}

		const orders = opsBookingGridSortOrders(parsed.sort)
		for (const o of orders) {
			bookingsQuery = bookingsQuery.order(o.column, {
				ascending: o.ascending,
				...(o.nullsFirst !== undefined ? { nullsFirst: o.nullsFirst } : {}),
			})
		}

		const from = (parsed.page - 1) * parsed.pageSize
		const to = from + parsed.pageSize - 1
		bookingsQuery = bookingsQuery.range(from, to)

		const { data, error, count } = await bookingsQuery

		if (error) {
			const correlationId = newOpsCorrelationId()
			loadError = { message: error.message }
			logOpsAction({
				action: 'ops_booking_grid_fetch',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: error.code ?? 'supabase_read',
				meta: { hint: 'bookings advanced search' },
			})
		} else {
			rows = (data ?? []) as BookingGridRow[]
			totalCount = count
		}
	}

	const total = totalCount ?? 0
	const totalPages =
		total > 0 ? Math.min(OPS_BOOKING_GRID_MAX_PAGE, Math.ceil(total / parsed.pageSize)) : 0
	const hasNext =
		parsed.shouldQuery &&
		totalPages > 0 &&
		parsed.page < totalPages &&
		parsed.page < OPS_BOOKING_GRID_MAX_PAGE
	const hasPrev = parsed.shouldQuery && parsed.page > 1

	return (
		<OpsAdvancedBookingSearchFiltersCollapsible defaultOpen={parsed.shouldQuery}>
			<div>
				<h2 className="text-base font-semibold text-ops-foreground">Advanced booking search</h2>
				<p className="text-sm text-ops-muted">
					Search by reference, contact, pickup dates, status, payment, or intent. Results replace the main queue
					until you{' '}
					<Link href={OPS_BOOKINGS_PATH} className="font-medium text-primary underline-offset-2 hover:underline">
						clear search
					</Link>
					.
				</p>
			</div>

			<OpsFilterRow aria-label="Advanced booking search filters" className="mt-0">
				<form
					method="get"
					action={OPS_BOOKINGS_PATH}
					className="flex w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
				>
					<div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
						<label className="flex flex-col gap-1 text-xs text-ops-muted">
							<span className="font-medium text-ops-foreground">Reference / id</span>
							<input
								name={`${PREFIX}q`}
								type="search"
								defaultValue={parsed.q}
								placeholder="VST-… or UUID"
								className="min-h-10 rounded-md border border-ops-border bg-ops-canvas px-2 text-sm text-ops-foreground"
							/>
						</label>
						<label className="flex flex-col gap-1 text-xs text-ops-muted">
							<span className="font-medium text-ops-foreground">Phone / email</span>
							<input
								name={`${PREFIX}contact`}
								type="search"
								defaultValue={parsed.contact}
								placeholder="Contains match"
								className="min-h-10 rounded-md border border-ops-border bg-ops-canvas px-2 text-sm text-ops-foreground"
							/>
						</label>
						<label className="flex flex-col gap-1 text-xs text-ops-muted">
							<span className="font-medium text-ops-foreground">Pickup from (UTC)</span>
							<input
								name={`${PREFIX}date_from`}
								type="date"
								defaultValue={parsed.dateFrom ?? ''}
								className="min-h-10 rounded-md border border-ops-border bg-ops-canvas px-2 text-sm text-ops-foreground"
							/>
						</label>
						<label className="flex flex-col gap-1 text-xs text-ops-muted">
							<span className="font-medium text-ops-foreground">Pickup to (UTC)</span>
							<input
								name={`${PREFIX}date_to`}
								type="date"
								defaultValue={parsed.dateTo ?? ''}
								className="min-h-10 rounded-md border border-ops-border bg-ops-canvas px-2 text-sm text-ops-foreground"
							/>
						</label>
						<label className="flex flex-col gap-1 text-xs text-ops-muted">
							<span className="font-medium text-ops-foreground">Status</span>
							<select
								name={`${PREFIX}status`}
								defaultValue={parsed.status}
								className="min-h-10 rounded-md border border-ops-border bg-ops-canvas px-2 text-sm text-ops-foreground"
							>
								<option value="">Any status</option>
								{STATUS_OPTIONS.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1 text-xs text-ops-muted">
							<span className="font-medium text-ops-foreground">Payment status</span>
							<select
								name={`${PREFIX}payment_status`}
								defaultValue={parsed.paymentStatus}
								className="min-h-10 rounded-md border border-ops-border bg-ops-canvas px-2 text-sm text-ops-foreground"
							>
								<option value="">Any payment</option>
								{PAYMENT_STATUS_OPTIONS.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1 text-xs text-ops-muted">
							<span className="font-medium text-ops-foreground">Intent</span>
							<select
								name={`${PREFIX}booking_intent`}
								defaultValue={parsed.bookingIntent}
								className="min-h-10 rounded-md border border-ops-border bg-ops-canvas px-2 text-sm text-ops-foreground"
							>
								{INTENT_OPTIONS.map((o) => (
									<option key={o.value || 'any'} value={o.value}>
										{o.label}
									</option>
								))}
							</select>
						</label>
						<input type="hidden" name={`${PREFIX}sort`} value={parsed.sort} />
					</div>
					<button
						type="submit"
						className="min-h-10 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-600"
					>
						Search
					</button>
				</form>
			</OpsFilterRow>

			<div className="flex flex-wrap items-center gap-2 text-xs text-ops-muted">
				<span className="font-medium uppercase tracking-wide text-ops-muted">Sort</span>
				{SORT_LINKS.map(({ sort, label }) => {
					const active = parsed.sort === sort
					return (
						<Link
							key={sort}
							href={gridHref(parsed, { sort, page: 1 })}
							className={
								active
									? 'rounded bg-ops-surface-hover px-2 py-1 font-medium text-ops-foreground'
									: 'rounded px-2 py-1 text-primary underline-offset-2 hover:underline'
							}
							aria-current={active ? 'true' : undefined}
						>
							{label}
						</Link>
					)
				})}
			</div>

			{loadError ? (
				<OpsFetchErrorIsland title="Bookings could not be loaded" message={loadError.message} />
			) : null}

			{parsed.shouldQuery && !loadError ? (
				<>
					<OpsTableShell caption="Booking search results">
						<thead className="border-b border-ops-border bg-ops-surface/60 text-ops-table-head text-xs uppercase tracking-wide text-ops-muted">
							<tr>
								<th scope="col" className="px-3 py-2 font-medium">
									Reference
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
									Pickup
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Route
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Customer
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-0 py-0">
										<OpsEmptyState
											className="border-0"
											title="No bookings match"
											description="No bookings match the current filters. Try widening the dates or clearing some filters."
										/>
									</td>
								</tr>
							) : (
								rows.map((row) => {
									const refLabel = row.payment_reference ?? `${row.id.slice(0, 8)}…`
									return (
										<tr key={row.id} className="border-b border-ops-border/80">
											<td className="px-3 py-2 font-mono text-xs text-ops-foreground">
												{refLabel}
											</td>
											<td className="px-3 py-2 text-sm capitalize">{row.status ?? '—'}</td>
											<td className="px-3 py-2 text-sm capitalize">
												{row.payment_status ?? '—'}
											</td>
											<td className="px-3 py-2 text-sm text-ops-foreground">
												<span className="rounded bg-muted/60 px-2 py-0.5 text-xs">
													{formatBookingIntentLabel(row.booking_intent)}
												</span>
											</td>
											<td className="px-3 py-2 text-sm text-ops-muted whitespace-nowrap">
												{row.pickup_datetime
													? new Date(row.pickup_datetime).toLocaleString('en-ZA', {
															timeZone: 'UTC',
														})
													: '—'}
											</td>
											<td className="max-w-[14rem] px-3 py-2 text-sm text-ops-muted">
												{formatRouteSummary(row.origin_name, row.destination_name)}
											</td>
											<td className="max-w-[10rem] truncate px-3 py-2 text-sm text-ops-muted">
												{truncateText(row.customer_name, 48)}
											</td>
										</tr>
									)
								})
							)}
						</tbody>
					</OpsTableShell>

					{rows.length > 0 ? (
						<nav
							className="flex flex-wrap items-center justify-between gap-3 text-sm text-ops-muted"
							aria-label="Results pagination"
						>
							<div>
								Page {parsed.page}
								{totalPages > 0 ? ` of ${totalPages}` : ''} · {total} result
								{total === 1 ? '' : 's'} · {OPS_BOOKING_GRID_PAGE_SIZE} per page (max page{' '}
								{OPS_BOOKING_GRID_MAX_PAGE})
							</div>
							<div className="flex gap-2">
								{hasPrev ? (
									<Link
										href={gridHref(parsed, { page: parsed.page - 1 })}
										className="rounded-md border border-ops-border bg-ops-surface px-3 py-1.5 text-ops-foreground hover:bg-ops-surface-hover"
									>
										Previous
									</Link>
								) : (
									<span className="rounded-md border border-ops-border/40 px-3 py-1.5 opacity-50">
										Previous
									</span>
								)}
								{hasNext ? (
									<Link
										href={gridHref(parsed, { page: parsed.page + 1 })}
										className="rounded-md border border-ops-border bg-ops-surface px-3 py-1.5 text-ops-foreground hover:bg-ops-surface-hover"
									>
										Next
									</Link>
								) : (
									<span className="rounded-md border border-ops-border/40 px-3 py-1.5 opacity-50">
										Next
									</span>
								)}
							</div>
						</nav>
					) : null}
				</>
			) : (
				<OpsEmptyState
					title="Search bookings"
					description={
						queueFiltersAvailable
							? 'Set at least one filter and press Search — or use the main queue filters below when you are not searching.'
							: 'Set at least one filter and press Search.'
					}
				/>
			)}
		</OpsAdvancedBookingSearchFiltersCollapsible>
	)
}
