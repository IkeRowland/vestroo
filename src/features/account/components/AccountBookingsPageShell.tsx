'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'

import { accountPortalCancelBooking } from '@/actions/accountPortalCancelBooking'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AccountPortalQuoteSection } from '@/features/account/components/AccountPortalQuoteSection'
import { AccountResponsiveTableShell } from '@/features/account/components/account-responsive-table-shell'
import { AccountBookingsFilters } from '@/features/account/components/AccountBookingsFilters'
import { AccountNewBookingSheet } from '@/features/account/components/AccountNewBookingSheet'
import { BookThisAgainButton } from '@/features/account/components/BookThisAgainButton'
import { accountBookingsCopy } from '@/features/account/copy/account-bookings-copy'
import { accountBookingsTableStatusPill } from '@/lib/account-bookings-table-status'
import { AvatarCell, DetailRail, Pagination, SplitView, StatusPill } from '@/components/saas'
import {
	ACCOUNT_BOOKINGS_LIST_PAGE_SIZE,
	accountBookingsListPathWithQuery,
	accountBookingsListHref,
	accountBookingsListSearchExcludingPage,
	flipAccountBookingsSort,
} from '@/lib/account-bookings-list-query'
import type { AccountBookingsListParsed, AccountBookingsListRow } from '@/lib/account-bookings-list-query'
import type { AccountBookingFormLoad } from '@/lib/account-booking-form-load'
import { ACCOUNT_BOOKINGS_PATH } from '@/lib/account-portal-booking-path'
import { accountBillingQuoteViewerPath } from '@/lib/account-invoices-archive-query'
import { buildBookAgainSearchPrefillHrefFromBooking } from '@/lib/quote-accept-prefill'
import type { AccountBookingRailDetail, AccountBookingTimelineItem } from '@/lib/account-booking-rail-types'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

const TERMINAL_MODIFY = new Set(['completed', 'cancelled', 'expired', 'paid_invoice', 'invoiced'])

type TripEmbed = {
	sort_order?: number | null
	trips?:
		| { id?: string; service_type?: string | null }
		| { id?: string; service_type?: string | null }[]
		| null
}

function extractTripServiceLabel(booking_trips: unknown): string | null {
	const raw = booking_trips
	if (!raw) return null
	const rows: TripEmbed[] = Array.isArray(raw) ? (raw as TripEmbed[]) : [raw as TripEmbed]
	const sorted = [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
	const embed = sorted[0]?.trips
	const trip = Array.isArray(embed) ? embed[0] : embed
	const st = trip?.service_type
	return typeof st === 'string' && st.trim() !== '' ? st : null
}

type Props = {
	portalRole: CustomerAccountMemberRoleDb
	parsed: AccountBookingsListParsed
	rows: AccountBookingsListRow[]
	total: number
	railDetail: AccountBookingRailDetail | null
	bookingFormLoad: AccountBookingFormLoad
}

function formatZar(amount: number | null): string {
	if (amount == null || Number.isNaN(amount)) return '—'
	return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

function formatPickup(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return new Intl.DateTimeFormat('en-ZA', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(d)
}

function bookingRefText(row: Pick<AccountBookingsListRow, 'id' | 'payment_reference'>): string {
	return row.payment_reference?.trim() || row.id.slice(0, 8)
}

function canPortalAct(role: CustomerAccountMemberRoleDb): boolean {
	return role === 'booker' || role === 'admin'
}

function canModifyStatus(status: string | null): boolean {
	const s = (status ?? '').trim()
	if (!s) return false
	if (TERMINAL_MODIFY.has(s)) return false
	if (s === 'ready_to_invoice' || s === 'invoiced' || s === 'paid_invoice') return false
	return true
}

export function AccountBookingsPageShell({
	portalRole,
	parsed,
	rows,
	total,
	railDetail,
	bookingFormLoad,
}: Props) {
	const router = useRouter()
	const listFocusReturnRef = React.useRef<HTMLDivElement>(null)
	const [cancelOpen, setCancelOpen] = React.useState(false)
	const [cancelError, setCancelError] = React.useState<string | null>(null)
	const [cancelPending, startCancel] = React.useTransition()
	const canAct = canPortalAct(portalRole)
	const totalPages = Math.max(1, Math.ceil(total / ACCOUNT_BOOKINGS_LIST_PAGE_SIZE))
	const showRail = Boolean(parsed.selectedBookingId && railDetail)
	const d = railDetail
	const b = d?.booking

	const modifyHref = React.useMemo(() => {
		if (!b) return '/book/modify'
		return `/book/modify?id=${encodeURIComponent(b.id)}`
	}, [b])

	const rebookHref = React.useMemo(() => {
		if (!b) return `${ACCOUNT_BOOKINGS_PATH}?omitTripDate=1`
		return buildBookAgainSearchPrefillHrefFromBooking(
			{
				origin_address: b.origin_name,
				destination_address: b.destination_name,
				passenger_count: b.passenger_count,
				booking_intent: b.booking_intent,
				service_type: d?.trip.serviceType ?? null,
			},
			ACCOUNT_BOOKINGS_PATH,
		)
	}, [b, d?.trip.serviceType])

	const receiptHref =
		d?.receiptQuoteId && portalRole === 'admin' ? accountBillingQuoteViewerPath(d.receiptQuoteId) : null

	const [newBookingOpen, setNewBookingOpen] = React.useState(
		() => bookingFormLoad.bookSearchPrefill !== null,
	)
	const [newBookingFormKey, setNewBookingFormKey] = React.useState(0)

	const openNewBookingModal = React.useCallback(() => {
		setNewBookingFormKey((k) => k + 1)
		setNewBookingOpen(true)
	}, [])

	const onCloseRail = () => {
		router.push(accountBookingsListPathWithQuery({ ...parsed, selectedBookingId: null }))
	}

	const onConfirmCancel = () => {
		if (!b) return
		setCancelError(null)
		startCancel(async () => {
			const r = await accountPortalCancelBooking({ bookingId: b.id })
			if (r.success) {
				setCancelOpen(false)
				router.push(accountBookingsListPathWithQuery({ ...parsed, selectedBookingId: null }))
				router.refresh()
			} else {
				setCancelError(r.error)
			}
		})
	}

	return (
		<>
			<SplitView
				theme="account"
				listFocusReturnRef={listFocusReturnRef}
				detailVisible={showRail}
				detailSheetDialogTitle={accountBookingsCopy.detailSheetTitle}
				onCloseDetail={onCloseRail}
				list={
					<div ref={listFocusReturnRef} className="min-w-0 space-y-6" tabIndex={-1}>
						<AccountBookingsFilters parsed={parsed} />
						<div>
							<div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm text-account-muted" role="status">
									{total === 0
										? accountBookingsCopy.tableEmpty
										: (() => {
												const fromIdx = (parsed.page - 1) * ACCOUNT_BOOKINGS_LIST_PAGE_SIZE + 1
												const toIdx = Math.min(total, parsed.page * ACCOUNT_BOOKINGS_LIST_PAGE_SIZE)
												return `Showing ${fromIdx}–${toIdx} of ${total}`
											})()}
								</p>
								<div className="flex flex-wrap gap-2">
									<Button variant="outline" size="sm" asChild>
										<Link href={accountBookingsListHref(parsed, flipAccountBookingsSort(parsed))}>
											{accountBookingsCopy.tableSortPickup(parsed.sort === 'pickup_asc')}
										</Link>
									</Button>
									<Button size="sm" type="button" onClick={openNewBookingModal}>
										{accountBookingsCopy.tableNewTrip}
									</Button>
								</div>
							</div>
							<div className="max-h-[min(70vh,800px)] overflow-y-auto rounded-account-card border border-account-border bg-account-surface shadow-account-1 md:overflow-x-auto">
								<AccountResponsiveTableShell
									stackAriaLabel={accountBookingsCopy.tableCaption}
									desktop={
										<Table
											className="min-w-[880px] border-collapse text-left"
											aria-label={accountBookingsCopy.tableCaption}
										>
									<TableHeader>
										<TableRow className="border-b border-account-border bg-account-surface-hover/80 text-xs font-medium uppercase tracking-wide text-account-muted hover:bg-account-surface-hover/80">
											<TableHead className="whitespace-nowrap px-3 py-2.5 text-left text-account-muted">
												{accountBookingsCopy.tableRef}
											</TableHead>
											<TableHead className="whitespace-nowrap px-3 py-2.5 text-left text-account-muted">
												{accountBookingsCopy.tablePickup}
											</TableHead>
											<TableHead className="min-w-[10rem] px-3 py-2.5 text-left text-account-muted">
												{accountBookingsCopy.tableRoute}
											</TableHead>
											<TableHead className="px-3 py-2.5 text-left text-account-muted">
												{accountBookingsCopy.tableVehicleClass}
											</TableHead>
											<TableHead className="px-3 py-2.5 text-left text-account-muted">
												{accountBookingsCopy.tableStatus}
											</TableHead>
											<TableHead className="px-3 py-2.5 text-right tabular-nums text-account-muted">
												{accountBookingsCopy.tableAmount}
											</TableHead>
											<TableHead className="w-10 px-2 py-2.5 text-account-muted" scope="col" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{rows.map((row) => {
											const pill = accountBookingsTableStatusPill(row.status)
											return (
												<TableRow
													key={row.id}
													className="cursor-pointer border-b border-account-border last:border-0 hover:bg-account-surface-active/30"
													onClick={() =>
														router.push(
															accountBookingsListHref(parsed, { selectedBookingId: row.id, page: parsed.page }),
														)
													}
												>
													<TableCell className="px-3 py-2.5 font-mono text-xs text-account-foreground">
														{bookingRefText(row)}
													</TableCell>
													<TableCell className="whitespace-nowrap px-3 py-2.5 text-account-muted">
														{formatPickup(row.pickup_datetime)}
													</TableCell>
													<TableCell
														className="min-w-0 max-w-xs truncate px-3 py-2.5"
														title={[row.origin_name, row.destination_name].filter(Boolean).join(' → ')}
													>
														<span className="text-account-muted">
															{[row.origin_name, row.destination_name]
																.map((s) => (s ?? '').trim())
																.filter((s) => s.length > 0)
																.join(' → ') || '—'}
														</span>
													</TableCell>
													<TableCell className="min-w-0 px-3 py-2.5 text-account-muted">
														{extractTripServiceLabel(row.booking_trips) ?? '—'}
													</TableCell>
													<TableCell className="px-3 py-2.5">
														<StatusPill theme="account" tone={pill.tone} dot>
															{pill.label}
														</StatusPill>
													</TableCell>
													<TableCell className="px-3 py-2.5 text-right tabular-nums text-account-foreground">
														{formatZar(row.total_amount)}
													</TableCell>
													<TableCell className="p-0 text-right" onClick={(e) => e.stopPropagation()}>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8"
																	aria-label={accountBookingsCopy.tableActions}
																>
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end" className="w-48">
																<DropdownMenuItem
																	onClick={() =>
																		router.push(
																			accountBookingsListHref(parsed, {
																				selectedBookingId: row.id,
																				page: parsed.page,
																			}),
																		)
																	}
																>
																	{accountBookingsCopy.tableRowOpen}
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
									}
									mobileStack={
										<ul className="divide-y divide-account-border p-3">
											{rows.map((row) => {
												const pill = accountBookingsTableStatusPill(row.status)
												const routeLabel =
													[row.origin_name, row.destination_name]
														.map((s) => (s ?? '').trim())
														.filter((s) => s.length > 0)
														.join(' → ') || '—'
												const open = () =>
													router.push(
														accountBookingsListHref(parsed, {
															selectedBookingId: row.id,
															page: parsed.page,
														}),
													)
												return (
													<li key={row.id}>
														<article
															className="cursor-pointer rounded-lg py-3 outline-none transition hover:bg-account-surface-active/30 focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-surface"
															role="button"
															tabIndex={0}
															aria-label={`${accountBookingsCopy.tableRowOpen}: ${bookingRefText(row)}`}
															onClick={open}
															onKeyDown={(e) => {
																if (e.key === 'Enter' || e.key === ' ') {
																	e.preventDefault()
																	open()
																}
															}}
														>
															<div className="flex items-start justify-between gap-2">
																<div className="min-w-0 flex-1 space-y-2">
																	<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
																		<span className="font-mono text-xs text-account-foreground">
																			{bookingRefText(row)}
																		</span>
																		<StatusPill theme="account" tone={pill.tone} dot>
																			{pill.label}
																		</StatusPill>
																	</div>
																	<p className="text-xs text-account-muted">
																		<span className="font-medium text-account-foreground">
																			{accountBookingsCopy.tablePickup}:{' '}
																		</span>
																		{formatPickup(row.pickup_datetime)}
																	</p>
																	<p className="text-sm text-account-foreground">{routeLabel}</p>
																	<dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
																		<div>
																			<dt className="text-account-muted">{accountBookingsCopy.tableVehicleClass}</dt>
																			<dd className="text-account-foreground">
																				{extractTripServiceLabel(row.booking_trips) ?? '—'}
																			</dd>
																		</div>
																		<div className="text-right">
																			<dt className="text-account-muted">{accountBookingsCopy.tableAmount}</dt>
																			<dd className="tabular-nums text-account-foreground">
																				{formatZar(row.total_amount)}
																			</dd>
																		</div>
																	</dl>
																</div>
																<div className="shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
																	<DropdownMenu>
																		<DropdownMenuTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="min-h-11 min-w-11"
																				aria-label={accountBookingsCopy.tableActions}
																			>
																				<MoreHorizontal className="h-4 w-4" />
																			</Button>
																		</DropdownMenuTrigger>
																		<DropdownMenuContent align="end" className="w-48">
																			<DropdownMenuItem
																				onClick={() =>
																					router.push(
																						accountBookingsListHref(parsed, {
																							selectedBookingId: row.id,
																							page: parsed.page,
																						}),
																					)
																				}
																			>
																				{accountBookingsCopy.tableRowOpen}
																			</DropdownMenuItem>
																		</DropdownMenuContent>
																	</DropdownMenu>
																</div>
															</div>
														</article>
													</li>
												)
											})}
										</ul>
									}
								/>
							</div>
							{total > 0 ? (
								<div className="pt-2">
									<Pagination
										theme="account"
										pathname="/account/bookings"
										query={accountBookingsListSearchExcludingPage(parsed)}
										currentPage={parsed.page}
										totalPages={totalPages}
										totalCount={total}
										perPage={25}
										perOmitDefault={25}
										hidePerPageSelect
										pageParam="acct_page"
										perParam="acct_per"
									/>
								</div>
							) : null}
						</div>
					</div>
				}
				detail={
					d && b ? (
						<DetailRail
							theme="account"
							className="h-full min-h-0 min-w-0 flex-1"
							title={bookingRefText(b as AccountBookingsListRow)}
							showHeaderClose
							onClose={onCloseRail}
							closeAriaLabel={accountBookingsCopy.detailClose}
							footer={
								<div className="flex flex-col gap-2">
									{receiptHref ? (
										<Button variant="secondary" asChild>
											<Link href={receiptHref}>{accountBookingsCopy.actionsReceipt}</Link>
										</Button>
									) : (
										<p className="text-xs text-account-muted">{accountBookingsCopy.actionsReceiptUnavailable}</p>
									)}
								</div>
							}
						>
							<AccountBookingRailBody
								d={d}
								modifyHref={modifyHref}
								rebookHref={rebookHref}
								canAct={canAct}
								onCancelRequest={() => setCancelOpen(true)}
							/>
						</DetailRail>
					) : null
				}
			/>
			<AccountNewBookingSheet
				open={newBookingOpen}
				onOpenChange={setNewBookingOpen}
				formKey={newBookingFormKey}
				bookingFormLoad={bookingFormLoad}
			/>
			{b ? (
				<AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{accountBookingsCopy.cancelDialogTitle}</AlertDialogTitle>
							<AlertDialogDescription asChild>
								<div>
									<p>
										{accountBookingsCopy.cancelDialogBody(bookingRefText(b as AccountBookingsListRow))}
									</p>
									{cancelError ? (
										<p className="mt-2 text-sm font-medium text-destructive">{cancelError}</p>
									) : null}
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{accountBookingsCopy.cancelDialogBack}</AlertDialogCancel>
							<AlertDialogAction onClick={onConfirmCancel} disabled={cancelPending || !canAct}>
								{accountBookingsCopy.cancelDialogConfirm}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			) : null}
		</>
	)
}

function AccountBookingRailBody({
	d,
	modifyHref,
	rebookHref,
	canAct,
	onCancelRequest,
}: {
	d: AccountBookingRailDetail
	modifyHref: string
	rebookHref: string
	canAct: boolean
	onCancelRequest: () => void
}) {
	const b = d.booking
	const awaitingOps = String(b.status ?? '').trim() === 'pending_confirmation'
	return (
		<div className="space-y-6 text-account-foreground">
			{awaitingOps ? (
				<div
					className="rounded-lg border border-account-border bg-account-surface-hover px-3 py-2 text-sm text-account-foreground"
					role="status"
				>
					{accountBookingsCopy.detailPendingConfirmationBanner}
				</div>
			) : null}
			<section>
				<h3 className="text-xs font-semibold uppercase tracking-wide text-account-muted">
					{accountBookingsCopy.detailItinerary}
				</h3>
				{d.staticMapUrl ? (
					<div className="mt-2 overflow-hidden rounded-md border border-account-border bg-account-surface-hover">
						{/* eslint-disable-next-line @next/next/no-img-element -- static map URL is server-scoped */}
						<img
							src={d.staticMapUrl}
							alt={accountBookingsCopy.detailMapAlt}
							width={400}
							height={200}
							loading="lazy"
							className="h-40 w-full object-cover"
						/>
					</div>
				) : (
					<div className="mt-2 flex h-32 items-center justify-center rounded-md border border-dashed border-account-border bg-account-surface-active text-sm text-account-muted">
						{accountBookingsCopy.detailMapPlaceholder}
					</div>
				)}
				<div className="mt-2 space-y-1 text-sm">
					<p>
						<span className="text-account-muted">Pickup: </span>
						{b.origin_name?.trim() || '—'}
					</p>
					<p>
						<span className="text-account-muted">Drop-off: </span>
						{b.destination_name?.trim() || '—'}
					</p>
				</div>
			</section>
			<section>
				<h3 className="text-xs font-semibold uppercase tracking-wide text-account-muted">{accountBookingsCopy.detailTrip}</h3>
				<dl className="mt-2 space-y-1 text-sm">
					<div className="flex justify-between gap-2">
						<dt className="text-account-muted">{accountBookingsCopy.detailDate}</dt>
						<dd className="text-right">{formatPickup(b.pickup_datetime)}</dd>
					</div>
					<div className="flex justify-between gap-2">
						<dt className="text-account-muted">{accountBookingsCopy.detailPassengers}</dt>
						<dd className="text-right">{b.passenger_count != null ? String(b.passenger_count) : '—'}</dd>
					</div>
					<div>
						<dt className="text-account-muted">{accountBookingsCopy.detailSpecialInstructions}</dt>
						<dd className="mt-0.5">
							{[b.flight_number?.trim(), b.hourly_service_area_notes?.trim()]
								.filter((x) => x)
								.join(' · ') || '—'}
						</dd>
					</div>
					<div className="flex justify-between gap-2">
						<dt className="text-account-muted">{accountBookingsCopy.detailVehicle}</dt>
						<dd className="min-w-0 text-right text-account-foreground">
							{d.trip.assignedFleetVehicleName ? (
								<span>
									<span className="font-medium">{d.trip.assignedFleetVehicleName}</span>
									{d.trip.vehicleClassLabel ? (
										<span className="text-account-muted"> · {d.trip.vehicleClassLabel}</span>
									) : null}
								</span>
							) : (
								d.trip.vehicleClassLabel ?? '—'
							)}
						</dd>
					</div>
					<div className="flex justify-between gap-2 text-account-muted">
						<dt>Total</dt>
						<dd className="tabular-nums text-foreground">{formatZar(b.total_amount)}</dd>
					</div>
				</dl>
			</section>
			<section>
				<h3 className="text-xs font-semibold uppercase tracking-wide text-account-muted">{accountBookingsCopy.detailDriver}</h3>
				<div className="mt-2">
					{d.driver.assigned && d.driver.displayName ? (
						<AvatarCell
							theme="account"
							name={d.driver.displayName}
							secondary={accountBookingsCopy.detailDriverNote}
						/>
					) : (
						<p className="text-sm text-account-muted">{accountBookingsCopy.detailDriverUnassigned}</p>
					)}
				</div>
			</section>
			<section>
				<h3 className="text-xs font-semibold uppercase tracking-wide text-account-muted">
					{accountBookingsCopy.detailQuote}
				</h3>
				<div className="mt-2">
					<AccountPortalQuoteSection quote={d.quote} />
				</div>
			</section>
			<section>
				<h3 className="text-xs font-semibold uppercase tracking-wide text-account-muted">{accountBookingsCopy.detailComms}</h3>
				{d.timeline.length === 0 ? (
					<p className="mt-1 text-sm text-account-muted">{accountBookingsCopy.detailCommsEmpty}</p>
				) : (
					<ol className="relative mt-3 space-y-3 border-l border-account-border pl-4 text-sm">
						{d.timeline.map((ev: AccountBookingTimelineItem, i: number) => (
							<li key={`${ev.kind}-${i}-${ev.at}`} className="relative -translate-x-px pl-0">
								<div
									aria-hidden
									className="absolute -left-[0.5rem] top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border border-account-border bg-primary"
								/>
								<p className="font-medium text-account-foreground">{ev.label}</p>
								<p className="text-xs text-account-muted">
									{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(
										new Date(ev.at),
									)}
								</p>
							</li>
						))}
					</ol>
				)}
			</section>
			{canAct ? (
				<div className="flex flex-col gap-2 border-t border-account-border pt-3">
					{canModifyStatus(b.status) ? (
						<Button asChild>
							<Link href={modifyHref}>{accountBookingsCopy.actionsModify}</Link>
						</Button>
					) : null}
					<Button
						variant="outline"
						type="button"
						onClick={onCancelRequest}
						disabled={!canModifyStatus(b.status) || b.payment_status === 'paid' || b.status === 'cancelled'}
					>
						{accountBookingsCopy.actionsCancel}
					</Button>
					<BookThisAgainButton searchHref={rebookHref} />
				</div>
			) : null}
		</div>
	)
}
