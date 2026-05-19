'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
import { AvatarCell } from '@/components/saas'
import { BookThisAgainButton } from '@/features/account/components/BookThisAgainButton'
import { accountBookingsCopy } from '@/features/account/copy/account-bookings-copy'
import type { AccountBookingsListRow } from '@/lib/account-bookings-list-query'
import { ACCOUNT_BOOKINGS_PATH } from '@/lib/account-portal-booking-path'
import { accountBillingQuoteViewerPath } from '@/lib/account-invoices-archive-query'
import { buildBookAgainSearchPrefillHrefFromBooking } from '@/lib/quote-accept-prefill'
import type { AccountBookingRailDetail, AccountBookingTimelineItem } from '@/lib/account-booking-rail-types'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

const TERMINAL_MODIFY = new Set(['completed', 'cancelled', 'expired', 'paid_invoice', 'invoiced'])

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

type Props = {
	portalRole: CustomerAccountMemberRoleDb
	detail: AccountBookingRailDetail
}

export function AccountBookingDetailView({ portalRole, detail: d }: Props) {
	const router = useRouter()
	const b = d.booking
	const canAct = canPortalAct(portalRole)
	const [cancelOpen, setCancelOpen] = React.useState(false)
	const [cancelError, setCancelError] = React.useState<string | null>(null)
	const [cancelPending, startCancel] = React.useTransition()

	const modifyHref = React.useMemo(() => `/book/modify?id=${encodeURIComponent(b.id)}`, [b.id])

	const rebookHref = React.useMemo(
		() =>
			buildBookAgainSearchPrefillHrefFromBooking(
				{
					origin_address: b.origin_name,
					destination_address: b.destination_name,
					passenger_count: b.passenger_count,
					booking_intent: b.booking_intent,
					service_type: d.trip.serviceType ?? null,
				},
				ACCOUNT_BOOKINGS_PATH,
			),
		[b, d.trip.serviceType],
	)

	const receiptHref =
		d.receiptQuoteId && portalRole === 'admin' ? accountBillingQuoteViewerPath(d.receiptQuoteId) : null

	const awaitingOps = String(b.status ?? '').trim() === 'pending_confirmation'

	const onConfirmCancel = () => {
		setCancelError(null)
		startCancel(async () => {
			const r = await accountPortalCancelBooking({ bookingId: b.id })
			if (r.success) {
				setCancelOpen(false)
				router.push(ACCOUNT_BOOKINGS_PATH)
				router.refresh()
			} else {
				setCancelError(r.error)
			}
		})
	}

	return (
		<>
			<div className="space-y-8">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<Link
							href={ACCOUNT_BOOKINGS_PATH}
							className="text-sm font-medium text-primary underline-offset-4 hover:underline"
						>
							{accountBookingsCopy.detailBackToBookings}
						</Link>
						<h1 className="mt-3 font-mono text-2xl font-semibold tracking-tight text-account-foreground">
							{bookingRefText(b as AccountBookingsListRow)}
						</h1>
					</div>
					{receiptHref ? (
						<Button variant="secondary" asChild>
							<Link href={receiptHref}>{accountBookingsCopy.actionsReceipt}</Link>
						</Button>
					) : (
						<p className="text-xs text-account-muted">{accountBookingsCopy.actionsReceiptUnavailable}</p>
					)}
				</div>

				<div className="rounded-account-card border border-account-border bg-account-surface p-6 shadow-account-1">
					<AccountBookingDetailBody
						d={d}
						modifyHref={modifyHref}
						rebookHref={rebookHref}
						canAct={canAct}
						awaitingOps={awaitingOps}
						displayAmountZar={d.displayAmountZar}
						onCancelRequest={() => setCancelOpen(true)}
					/>
				</div>
			</div>

			<AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{accountBookingsCopy.cancelDialogTitle}</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								<p>{accountBookingsCopy.cancelDialogBody(bookingRefText(b as AccountBookingsListRow))}</p>
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
		</>
	)
}

function AccountBookingDetailBody({
	d,
	modifyHref,
	rebookHref,
	canAct,
	awaitingOps,
	displayAmountZar,
	onCancelRequest,
}: {
	d: AccountBookingRailDetail
	modifyHref: string
	rebookHref: string
	canAct: boolean
	awaitingOps: boolean
	displayAmountZar: number | null
	onCancelRequest: () => void
}) {
	const b = d.booking

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
				<h2 className="text-xs font-semibold uppercase tracking-wide text-account-muted">
					{accountBookingsCopy.detailItinerary}
				</h2>
				{d.staticMapUrl ? (
					<div className="mt-2 overflow-hidden rounded-md border border-account-border bg-account-surface-hover">
						{/* eslint-disable-next-line @next/next/no-img-element -- static map URL is server-scoped */}
						<img
							src={d.staticMapUrl}
							alt={accountBookingsCopy.detailMapAlt}
							width={640}
							height={320}
							loading="lazy"
							className="min-h-[280px] w-full object-cover"
						/>
					</div>
				) : (
					<div className="mt-2 flex min-h-[280px] items-center justify-center rounded-md border border-dashed border-account-border bg-account-surface-active text-sm text-account-muted">
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
				<h2 className="text-xs font-semibold uppercase tracking-wide text-account-muted">
					{accountBookingsCopy.detailTrip}
				</h2>
				<dl className="mt-2 space-y-2 text-sm">
					<div>
						<dt className="text-account-muted">{accountBookingsCopy.detailDate}</dt>
						<dd className="mt-0.5">{formatPickup(b.pickup_datetime)}</dd>
					</div>
					<div>
						<dt className="text-account-muted">{accountBookingsCopy.detailPassengers}</dt>
						<dd className="mt-0.5">{b.passenger_count != null ? String(b.passenger_count) : '—'}</dd>
					</div>
					<div>
						<dt className="text-account-muted">{accountBookingsCopy.detailSpecialInstructions}</dt>
						<dd className="mt-0.5">
							{[b.flight_number?.trim(), b.hourly_service_area_notes?.trim()]
								.filter((x) => x)
								.join(' · ') || '—'}
						</dd>
					</div>
					<div>
						<dt className="text-account-muted">{accountBookingsCopy.detailVehicle}</dt>
						<dd className="mt-0.5 text-account-foreground">
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
					<div>
						<dt className="text-account-muted">{accountBookingsCopy.detailAmount}</dt>
						<dd className="mt-0.5 tabular-nums text-account-foreground">{formatZar(displayAmountZar)}</dd>
					</div>
				</dl>
			</section>
			<section>
				<h2 className="text-xs font-semibold uppercase tracking-wide text-account-muted">
					{accountBookingsCopy.detailDriver}
				</h2>
				<div className="mt-2">
					{d.driver.assigned && d.driver.displayName ? (
						<AvatarCell theme="account" name={d.driver.displayName} />
					) : (
						<p className="text-sm text-account-muted">{accountBookingsCopy.detailDriverUnassigned}</p>
					)}
				</div>
			</section>
			<section>
				<h2 className="text-xs font-semibold uppercase tracking-wide text-account-muted">
					{accountBookingsCopy.detailComms}
				</h2>
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
