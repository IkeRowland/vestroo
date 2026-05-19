'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AccountBookingsRealtimeBridge } from '@/features/account/components/AccountBookingsRealtimeBridge'
import { AccountResponsiveTableShell } from '@/features/account/components/account-responsive-table-shell'
import { AccountBookingsFilters } from '@/features/account/components/AccountBookingsFilters'
import { AccountNewBookingSheet } from '@/features/account/components/AccountNewBookingSheet'
import { accountBookingsCopy } from '@/features/account/copy/account-bookings-copy'
import { resolveAccountBookingDisplayAmountZar } from '@/lib/account-booking-display-amount'
import { accountBookingsTableStatusPill } from '@/lib/account-bookings-table-status'
import { Pagination, StatusPill } from '@/components/saas'
import {
	ACCOUNT_BOOKINGS_LIST_PAGE_SIZE,
	accountBookingsListHref,
	accountBookingsListSearchExcludingPage,
	flipAccountBookingsSort,
} from '@/lib/account-bookings-list-query'
import type { AccountBookingsListParsed, AccountBookingsListRow } from '@/lib/account-bookings-list-query'
import type { AccountBookingFormLoad } from '@/lib/account-booking-form-load'
import { accountPortalBookingDetailPath } from '@/lib/account-portal-booking-path'
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
	parsed: AccountBookingsListParsed
	rows: AccountBookingsListRow[]
	total: number
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

export function AccountBookingsPageShell({ parsed, rows, total, bookingFormLoad }: Props) {
	const router = useRouter()
	const totalPages = Math.max(1, Math.ceil(total / ACCOUNT_BOOKINGS_LIST_PAGE_SIZE))

	const [newBookingOpen, setNewBookingOpen] = React.useState(
		() => bookingFormLoad.bookSearchPrefill !== null,
	)
	const [newBookingFormKey, setNewBookingFormKey] = React.useState(0)

	const openNewBookingModal = React.useCallback(() => {
		setNewBookingFormKey((k) => k + 1)
		setNewBookingOpen(true)
	}, [])

	const openDetail = (bookingId: string) => {
		router.push(accountPortalBookingDetailPath(bookingId))
	}

	return (
		<>
			<AccountBookingsRealtimeBridge />
			<div className="min-w-0 space-y-6">
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
											const amountZar = resolveAccountBookingDisplayAmountZar(row)
											return (
												<TableRow
													key={row.id}
													className="cursor-pointer border-b border-account-border last:border-0 hover:bg-account-surface-active/30"
													onClick={() => openDetail(row.id)}
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
														{formatZar(amountZar)}
													</TableCell>
													<TableCell className="p-0 text-right" onClick={(e) => e.stopPropagation()}>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-8 w-8"
																	aria-label={accountBookingsCopy.tableActions}
																>
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end" className="w-48">
																<DropdownMenuItem onClick={() => openDetail(row.id)}>
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
										const amountZar = resolveAccountBookingDisplayAmountZar(row)
										const routeLabel =
											[row.origin_name, row.destination_name]
												.map((s) => (s ?? '').trim())
												.filter((s) => s.length > 0)
												.join(' → ') || '—'
										return (
											<li key={row.id}>
												<article
													className="cursor-pointer rounded-lg py-3 outline-none transition hover:bg-account-surface-active/30 focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-surface"
													role="button"
													tabIndex={0}
													aria-label={`${accountBookingsCopy.tableRowOpen}: ${bookingRefText(row)}`}
													onClick={() => openDetail(row.id)}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault()
															openDetail(row.id)
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
																		{formatZar(amountZar)}
																	</dd>
																</div>
															</dl>
														</div>
														<div className="shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button
																		variant="ghost"
																		size="sm"
																		className="min-h-11 min-w-11"
																		aria-label={accountBookingsCopy.tableActions}
																	>
																		<MoreHorizontal className="h-4 w-4" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end" className="w-48">
																	<DropdownMenuItem onClick={() => openDetail(row.id)}>
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
			<AccountNewBookingSheet
				open={newBookingOpen}
				onOpenChange={setNewBookingOpen}
				formKey={newBookingFormKey}
				bookingFormLoad={bookingFormLoad}
			/>
		</>
	)
}
