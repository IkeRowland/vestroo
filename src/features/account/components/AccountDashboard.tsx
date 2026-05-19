import Link from 'next/link'
import { CalendarDays, Car, Clock, Receipt, Users } from 'lucide-react'

import { cn } from '@/lib/utils'

import { AccountNewBookingButton } from '@/features/account/components/AccountNewBookingSheet'
import { AccountResponsiveTableShell } from '@/features/account/components/account-responsive-table-shell'
import { KpiCard } from '@/components/saas/KpiCard'
import { EmptyState } from '@/components/saas/EmptyState'
import { StatusPill } from '@/components/saas/StatusPill'
import { accountDashboardCopy } from '@/features/account/copy/account-dashboard-copy'
import { portalRoleLabel } from '@/lib/account-portal-auth'
import { ACCOUNT_DASHBOARD_HREFS, type AccountDashboardSnapshot } from '@/lib/account-dashboard-query'
import { accountDashboardRailStatusPill } from '@/lib/account-dashboard-rail-status'
import {
	accountBillingQuoteViewerPath,
	formatInvoiceArchiveQuoteStatus,
	type AccountInvoiceArchiveRow,
} from '@/lib/account-invoices-archive-query'
import { ACCOUNT_BILLING_INVOICES_LIST_PATH } from '@/lib/account-invoices-list-query'
import {
	formatQueueStatusLabel,
	type AccountBookingsListRow,
} from '@/lib/account-bookings-list-query'
import type { AccountBookingFormLoad } from '@/lib/account-booking-form-load'
import { accountPortalBookingDetailPath } from '@/lib/account-portal-booking-path'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

type TripEmbed = {
	sort_order?: number | null
	trips?:
		| { id?: string; service_type?: string | null }
		| { id?: string; service_type?: string | null }[]
		| null
}

function normalizeBookingTrips(raw: unknown): TripEmbed[] {
	if (!raw) return []
	if (Array.isArray(raw)) return raw as TripEmbed[]
	return [raw as TripEmbed]
}

function extractTripServiceLabel(booking_trips: unknown): string | null {
	const rows = normalizeBookingTrips(booking_trips)
	const sorted = [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
	const embed = sorted[0]?.trips
	const trip = Array.isArray(embed) ? embed[0] : embed
	const st = trip?.service_type
	return typeof st === 'string' && st.trim() !== '' ? st : null
}

function bookingRef(row: Pick<AccountBookingsListRow, 'id' | 'payment_reference'>): string {
	const pr = row.payment_reference?.trim()
	return pr && pr.length > 0 ? pr : row.id.slice(0, 8)
}

function formatZar(amount: number | null): string {
	if (amount == null || Number.isNaN(amount)) return '—'
	return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

function formatPickup(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

function formatRoute(origin: string | null, dest: string | null): string {
	const o = origin?.trim() || ''
	const d = dest?.trim() || ''
	if (!o && !d) return '—'
	if (!o) return d
	if (!d) return o
	return `${o} → ${d}`
}

function invoicePreviewWhen(row: AccountInvoiceArchiveRow): string {
	const primary = row.sent_at ?? row.quote_created_at
	return formatPickup(primary)
}

function InvoiceStatusPill({ row }: { row: AccountInvoiceArchiveRow }) {
	const booking = row.booking_status
	const quote = row.quote_status
	const label =
		booking === 'ready_to_invoice' || booking === 'invoiced'
			? formatQueueStatusLabel(booking)
			: quote
				? formatInvoiceArchiveQuoteStatus(quote)
				: booking
					? formatQueueStatusLabel(booking)
					: '—'
	const tone =
		booking === 'paid_invoice'
			? ('success' as const)
			: booking === 'cancelled' || booking === 'expired'
				? ('danger' as const)
				: ('neutral' as const)
	return (
		<StatusPill theme="account" tone={tone} dot={false}>
			{label}
		</StatusPill>
	)
}

export type AccountDashboardProps = {
	accountName: string
	billingEntityRef: string | null
	email?: string
	role: CustomerAccountMemberRoleDb
	lastSignInLabel: string | null
	snapshot: AccountDashboardSnapshot
	newBookingFormLoad: AccountBookingFormLoad
}

export function AccountDashboard({
	accountName,
	billingEntityRef,
	email,
	role,
	lastSignInLabel,
	snapshot,
	newBookingFormLoad,
}: AccountDashboardProps) {
	const isAdmin = role === 'admin'
	const lastSignInDisplay =
		lastSignInLabel ?? accountDashboardCopy.lastSignInUnknown

	return (
		<div className="space-y-10">
			{snapshot.errors.length > 0 ? (
				<div
					className="rounded-lg border border-account-border bg-account-surface px-4 py-3 text-sm text-account-foreground"
					role="status"
				>
					Some dashboard figures could not be refreshed. Try again shortly.
				</div>
			) : null}

			<section aria-labelledby="account-dashboard-welcome-heading">
				<p className="text-xs font-medium uppercase tracking-wide text-account-muted">
					{accountDashboardCopy.welcomeKicker}
				</p>
				<h1
					id="account-dashboard-welcome-heading"
					className="mt-1 text-2xl font-semibold tracking-tight text-account-foreground sm:text-3xl"
				>
					{accountName}
				</h1>
				{billingEntityRef ? (
					<p className="mt-2 text-sm text-account-muted">
						Billing reference:{' '}
						<span className="text-account-foreground">{billingEntityRef}</span>
					</p>
				) : null}
				<div className="mt-4 flex flex-wrap items-center gap-3">
					<span className="inline-flex items-center rounded-full border border-account-border bg-account-surface-hover px-3 py-1 text-xs font-medium text-account-foreground">
						{accountDashboardCopy.rolePillPrefix} {portalRoleLabel(role)}
					</span>
					{email ? (
						<span className="text-sm text-account-muted">
							Signed in as <span className="text-account-foreground">{email}</span>
						</span>
					) : null}
				</div>
				<p className="mt-3 text-xs text-account-muted">
					{accountDashboardCopy.lastSignInPrefix}{' '}
					<span className="text-account-foreground">{lastSignInDisplay}</span>
				</p>
			</section>

			<section aria-labelledby="account-dashboard-kpis-heading">
				<h2 id="account-dashboard-kpis-heading" className="sr-only">
					Summary
				</h2>
				<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<li>
						<KpiCard
							theme="account"
							scorecardOnly
							label={accountDashboardCopy.kpiTripsThisMonth}
							icon={CalendarDays}
							value={snapshot.tripsThisMonth}
							shortDefinition={accountDashboardCopy.kpiTripsThisMonthHint}
							deltaPercent={null}
							deltaPolarity="neutral"
							drillHref={ACCOUNT_DASHBOARD_HREFS.tripsThisMonth}
						/>
					</li>
					<li>
						<KpiCard
							theme="account"
							scorecardOnly
							label={accountDashboardCopy.kpiUpcomingTrips}
							icon={Clock}
							value={snapshot.upcomingTrips}
							shortDefinition={accountDashboardCopy.kpiUpcomingTripsHint}
							deltaPercent={null}
							deltaPolarity="neutral"
							drillHref={ACCOUNT_DASHBOARD_HREFS.upcomingTrips}
						/>
					</li>
					{isAdmin ? (
						<li>
							<KpiCard
								theme="account"
								scorecardOnly
								label={accountDashboardCopy.kpiOpenInvoices}
								icon={Receipt}
								value={snapshot.openInvoices ?? 0}
								shortDefinition={accountDashboardCopy.kpiOpenInvoicesHint}
								deltaPercent={null}
								deltaPolarity="neutral"
								drillHref={ACCOUNT_DASHBOARD_HREFS.openInvoices}
							/>
						</li>
					) : null}
					{isAdmin ? (
						<li>
							<KpiCard
								theme="account"
								scorecardOnly
								label={accountDashboardCopy.kpiActiveMembers}
								icon={Users}
								value={snapshot.activeMembers ?? 0}
								shortDefinition={accountDashboardCopy.kpiActiveMembersHint}
								deltaPercent={null}
								deltaPolarity="neutral"
								drillHref={ACCOUNT_DASHBOARD_HREFS.members}
							/>
						</li>
					) : null}
				</ul>
			</section>

			<section aria-labelledby="account-dashboard-rail-heading">
				<div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
					<h2
						id="account-dashboard-rail-heading"
						className="text-lg font-semibold text-account-foreground"
					>
						{accountDashboardCopy.sectionUpcoming}
					</h2>
				</div>

				{snapshot.railTrips.length === 0 ? (
					<EmptyState
						theme="account"
						title={accountDashboardCopy.emptyRailTitle}
						description={accountDashboardCopy.emptyRailDescription}
						action={
							<AccountNewBookingButton
								bookingFormLoad={newBookingFormLoad}
								className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								{accountDashboardCopy.emptyRailCta}
							</AccountNewBookingButton>
						}
					/>
				) : (
					<div
						className={cn(
							'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-2 md:gap-4 md:overflow-visible [&::-webkit-scrollbar]:hidden',
						)}
					>
						{snapshot.railTrips.map((row) => (
							<DashboardTripCard key={row.id} row={row} />
						))}
					</div>
				)}
			</section>

			{isAdmin ? (
				<section aria-labelledby="account-dashboard-invoices-heading">
					<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<h2
							id="account-dashboard-invoices-heading"
							className="text-lg font-semibold text-account-foreground"
						>
							{accountDashboardCopy.sectionInvoices}
						</h2>
						<Link
							href={ACCOUNT_BILLING_INVOICES_LIST_PATH}
							className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							{accountDashboardCopy.invoiceViewAll} →
						</Link>
					</div>

					{snapshot.invoicePreviewFailed ? (
						<p className="mb-4 text-sm text-account-muted" role="status">
							{accountDashboardCopy.invoicePreviewFailedMessage}
						</p>
					) : null}

					<div className="overflow-y-auto rounded-account-card border border-account-border bg-account-surface shadow-account-1 md:overflow-x-auto">
						<AccountResponsiveTableShell
							stackAriaLabel={accountDashboardCopy.sectionInvoices}
							desktop={
								<table
									className="w-full min-w-[640px] border-collapse text-left text-sm"
									aria-label={accountDashboardCopy.sectionInvoices}
								>
									<caption className="sr-only">{accountDashboardCopy.sectionInvoices}</caption>
									<thead>
										<tr className="border-b border-account-border bg-account-surface-hover/80 text-xs font-semibold uppercase tracking-wide text-account-muted">
											<th className="py-3 pr-3 pl-4">{accountDashboardCopy.invoiceColReference}</th>
											<th className="py-3 pr-3">{accountDashboardCopy.invoiceColDate}</th>
											<th className="py-3 pr-3">{accountDashboardCopy.invoiceColAmount}</th>
											<th className="py-3 pr-3">{accountDashboardCopy.invoiceColStatus}</th>
											<th className="py-3 pr-4">{accountDashboardCopy.invoiceColAction}</th>
										</tr>
									</thead>
									<tbody className="text-account-foreground">
										{snapshot.recentInvoices.length === 0 ? (
											<tr>
												<td colSpan={5} className="px-4 py-8 text-center text-account-muted">
													No invoices or quotes yet.
												</td>
											</tr>
										) : (
											snapshot.recentInvoices.map((inv) => (
												<tr key={inv.quote_id ?? inv.booking_id} className="border-b border-account-border">
													<td className="py-3 pr-3 pl-4 font-mono text-xs">{inv.booking_reference}</td>
													<td className="py-3 pr-3 text-account-muted">{invoicePreviewWhen(inv)}</td>
													<td className="py-3 pr-3 tabular-nums">{formatZar(inv.total_zar)}</td>
													<td className="py-3 pr-3">
														<InvoiceStatusPill row={inv} />
													</td>
													<td className="py-3 pr-4">
														<div className="flex flex-wrap gap-2">
															{inv.quote_id && inv.has_rendered_html ? (
																<Link
																	href={accountBillingQuoteViewerPath(inv.quote_id)}
																	className="text-xs font-medium text-primary underline-offset-2 hover:underline"
																>
																	{accountDashboardCopy.invoiceDownload}
																</Link>
															) : (
																<span className="text-xs text-account-muted">
																	{accountDashboardCopy.invoiceActionUnavailable}
																</span>
															)}
															{inv.booking_status === 'ready_to_invoice' ||
															inv.booking_status === 'invoiced' ? (
																<Link
																	href={accountPortalBookingDetailPath(inv.booking_id)}
																	className="text-xs font-medium text-primary underline-offset-2 hover:underline"
																>
																	{accountDashboardCopy.invoicePay}
																</Link>
															) : null}
														</div>
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							}
							mobileStack={
								snapshot.recentInvoices.length === 0 ? (
									<p className="p-4 text-center text-sm text-account-muted">No invoices or quotes yet.</p>
								) : (
									<ul className="divide-y divide-account-border p-3">
										{snapshot.recentInvoices.map((inv) => (
											<li key={inv.quote_id ?? inv.booking_id}>
												<article className="space-y-2 py-3">
													<div className="flex flex-wrap items-start justify-between gap-2">
														<p className="font-mono text-xs text-account-foreground">{inv.booking_reference}</p>
														<p className="text-sm font-semibold tabular-nums text-account-foreground">
															{formatZar(inv.total_zar)}
														</p>
													</div>
													<p className="text-xs text-account-muted">{invoicePreviewWhen(inv)}</p>
													<InvoiceStatusPill row={inv} />
													<div className="flex flex-wrap gap-2 pt-1">
														{inv.quote_id && inv.has_rendered_html ? (
															<Link
																href={accountBillingQuoteViewerPath(inv.quote_id)}
																className="inline-flex min-h-10 items-center text-xs font-medium text-primary underline-offset-2 hover:underline"
															>
																{accountDashboardCopy.invoiceDownload}
															</Link>
														) : (
															<span className="text-xs text-account-muted">
																{accountDashboardCopy.invoiceActionUnavailable}
															</span>
														)}
														{inv.booking_status === 'ready_to_invoice' ||
														inv.booking_status === 'invoiced' ? (
															<Link
																href={accountPortalBookingDetailPath(inv.booking_id)}
																className="inline-flex min-h-10 items-center text-xs font-medium text-primary underline-offset-2 hover:underline"
															>
																{accountDashboardCopy.invoicePay}
															</Link>
														) : null}
													</div>
												</article>
											</li>
										))}
									</ul>
								)
							}
						/>
					</div>
				</section>
			) : null}
		</div>
	)
}

function DashboardTripCard({ row }: { row: AccountBookingsListRow }) {
	const route = formatRoute(row.origin_name, row.destination_name)
	const pickup = formatPickup(row.pickup_datetime)
	const service = extractTripServiceLabel(row.booking_trips)
	const pill = accountDashboardRailStatusPill(row.status)
	const ref = bookingRef(row)

	return (
		<article
			className="snap-center shrink-0 rounded-account-card border border-account-border bg-account-surface p-4 shadow-account-1 md:snap-none md:shrink"
			style={{ minWidth: 'min(100%, 320px)' }}
			aria-label={accountDashboardCopy.railCardAriaLabel(route)}
		>
			<div className="flex gap-3">
				<div
					className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-account-border bg-account-surface-hover text-account-muted"
					aria-hidden
				>
					<Car className="h-8 w-8 opacity-70" strokeWidth={1.25} />
				</div>
				<div className="min-w-0 flex-1">
					<p className="font-mono text-xs text-account-muted">{ref}</p>
					<p className="mt-1 line-clamp-2 text-sm font-semibold text-account-foreground">{route}</p>
					<p className="mt-1 text-xs text-account-muted">{pickup}</p>
					{service ? (
						<p className="mt-1 text-xs text-account-muted">{service}</p>
					) : null}
				</div>
			</div>
			<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
				<StatusPill theme="account" tone={pill.tone}>
					{pill.label}
				</StatusPill>
				<Link
					href={accountPortalBookingDetailPath(row.id)}
					className="inline-flex min-h-9 items-center justify-center rounded-md border border-account-border bg-account-surface-hover px-3 text-xs font-medium text-account-foreground transition hover:bg-account-surface-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas"
				>
					{accountDashboardCopy.railViewDetails}
				</Link>
			</div>
		</article>
	)
}
