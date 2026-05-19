'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'

import { bulkSendAccountClientInvoiceAction } from '@/actions/bulkSendAccountClientInvoice'
import { AccountQueueRowActions } from '@/features/ops/components/AccountQueueRowActions'
import { BookingsQueueTableRow } from '@/features/ops/components/BookingsQueueTableRow'
import { BookingsQueueStopNavCell } from '@/features/ops/components/bookings-queue-walk-in-actions-cell'
import { OpsAvatarCell } from '@/features/ops/components/OpsAvatarCell'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import { opsAccountClientDetailCopy } from '@/features/ops/copy/ops-account-client-detail-copy'
import {
	getBookingsQueuePaymentPillTone,
	getBookingsQueueStatusPillTone,
} from '@/features/ops/lib/ops-bookings-queue-pill-tones'
import { deriveAccountsQueueStageForBookingRow } from '@/lib/ops-accounts-queue-query'
import {
	assessBulkInvoiceEligibility,
	opsBookingQueueDisplayTotalZar,
} from '@/lib/ops-bulk-invoice-eligibility'
import type { OpsBookingsQueueRow } from '@/lib/ops-bookings-queue-select'
import { effectiveBookingStatusKeyForOps } from '@/lib/ops-booking-detail'
import { formatQueueStatusLabel } from '@/lib/ops-bookings-queue-query'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function truncateText(value: string | null, max: number): string {
	if (value == null || value === '') return '—'
	if (value.length <= max) return value
	return `${value.slice(0, max - 1)}…`
}

function formatRouteSummary(origin: string | null, dest: string | null): string {
	const o = truncateText(origin, 22)
	const d = truncateText(dest, 22)
	if (o === '—' && d === '—') return '—'
	return `${o} → ${d}`
}

function formatZar(amount: number | null): string {
	if (amount == null || Number.isNaN(amount)) return '—'
	return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

export type OpsAccountClientBookingsTableProps = {
	accountId: string
	rows: OpsBookingsQueueRow[]
	actionsSlot?: ReactNode
}

export function OpsAccountClientBookingsTable({
	accountId,
	rows,
	actionsSlot,
}: OpsAccountClientBookingsTableProps) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const eligibleOnPage = useMemo(() => {
		const map = new Map<string, ReturnType<typeof assessBulkInvoiceEligibility>>()
		for (const row of rows) {
			map.set(row.id, assessBulkInvoiceEligibility(row, accountId))
		}
		return map
	}, [rows, accountId])

	const eligibleRowIds = useMemo(
		() => rows.filter((r) => eligibleOnPage.get(r.id)?.eligible === true).map((r) => r.id),
		[rows, eligibleOnPage],
	)

	const allEligibleSelected =
		eligibleRowIds.length > 0 && eligibleRowIds.every((id) => selectedIds.has(id))
	const someEligibleSelected = eligibleRowIds.some((id) => selectedIds.has(id))

	const toggleAllEligible = () => {
		if (allEligibleSelected) {
			setSelectedIds(new Set())
			return
		}
		setSelectedIds(new Set(eligibleRowIds))
	}

	const toggleOne = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const selectedEligibleCount = [...selectedIds].filter(
		(id) => eligibleOnPage.get(id)?.eligible === true,
	).length

	async function runBulkInvoice() {
		setError(null)
		const ids = [...selectedIds].filter((id) => eligibleOnPage.get(id)?.eligible === true)
		if (ids.length === 0) return
		setBusy(true)
		try {
			const res = await bulkSendAccountClientInvoiceAction({
				customerAccountId: accountId,
				bookingIds: ids,
			})
			if (!res.ok) {
				setError(res.error.message)
				return
			}
			setSelectedIds(new Set())
			window.location.reload()
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="space-y-3">
			{selectedEligibleCount > 0 ? (
				<div
					className="flex flex-wrap items-center gap-3 rounded-lg border border-ops-border bg-ops-surface px-3 py-2 text-sm"
					role="status"
				>
					<span className="text-ops-muted">
						{opsAccountClientDetailCopy.bookingsSelectionCount(selectedEligibleCount)}
					</span>
					<Button type="button" size="sm" disabled={busy} onClick={() => void runBulkInvoice()}>
						{busy
							? opsAccountClientDetailCopy.sendingInvoice
							: opsAccountClientDetailCopy.sendInvoiceButton}
					</Button>
				</div>
			) : null}

			{error ? (
				<p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-ops-foreground">
					{error}
				</p>
			) : null}

			{actionsSlot}

			<OpsTableShell caption={opsAccountClientDetailCopy.bookingsTableCaption} tableClassName="text-sm">
				<thead>
					<tr className="border-b border-ops-border bg-ops-surface/60 text-left text-xs uppercase tracking-wide text-ops-muted">
						<th scope="col" className="w-10 px-2 py-2 font-medium">
							<input
								type="checkbox"
								className="h-4 w-4 rounded border-ops-border"
								checked={allEligibleSelected}
								ref={(el) => {
									if (el) {
										el.indeterminate = someEligibleSelected && !allEligibleSelected
									}
								}}
								disabled={eligibleRowIds.length === 0}
								aria-label={opsAccountClientDetailCopy.selectAllBookingsAria}
								onChange={toggleAllEligible}
							/>
						</th>
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
						const amountZar = opsBookingQueueDisplayTotalZar(row)
						const statusKeyForDisplay = effectiveBookingStatusKeyForOps(
							row.status,
							row.booking_trips,
						)
						const eligibility = eligibleOnPage.get(row.id)
						const canSelect = eligibility?.eligible === true
						const accountStage = deriveAccountsQueueStageForBookingRow({
							client_type: row.client_type,
							status: row.status,
							availability_checked_at: row.availability_checked_at,
						})

						return (
							<BookingsQueueTableRow
								key={row.id}
								bookingId={row.id}
								paymentReference={row.payment_reference}
							>
								<td
									className="px-2 py-2 align-middle"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => e.stopPropagation()}
								>
									<input
										type="checkbox"
										className={cn(
											'h-4 w-4 rounded border-ops-border',
											!canSelect && 'opacity-40',
										)}
										checked={selectedIds.has(row.id)}
										disabled={!canSelect}
										title={
											canSelect
												? undefined
												: eligibility && !eligibility.eligible
													? eligibility.reason
													: undefined
										}
										aria-label={opsAccountClientDetailCopy.rowCheckboxAria(refLabel)}
										onChange={() => toggleOne(row.id)}
										onClick={(e) => e.stopPropagation()}
									/>
								</td>
								<td className="px-3 py-2 font-mono text-xs">{refLabel}</td>
								<td className="max-w-[14rem] px-3 py-2">
									<OpsAvatarCell
										src={null}
										name={row.customer_name?.trim() || 'Unknown'}
										secondary={row.customer_email?.trim() || null}
									/>
								</td>
								<td className="whitespace-nowrap px-3 py-2 text-sm text-ops-muted">
									{row.pickup_datetime
										? new Date(row.pickup_datetime).toLocaleString('en-ZA', {
												timeZone: 'UTC',
											})
										: '—'}
								</td>
								<td className="whitespace-nowrap px-3 py-2 tabular-nums text-sm">
									{formatZar(amountZar)}
								</td>
								<td className="px-3 py-2 text-sm">
									<OpsStatusPill tone={getBookingsQueueStatusPillTone(statusKeyForDisplay)}>
										{statusKeyForDisplay ? formatQueueStatusLabel(statusKeyForDisplay) : '—'}
									</OpsStatusPill>
								</td>
								<td className="px-3 py-2 text-sm">
									<OpsStatusPill tone={getBookingsQueuePaymentPillTone(row.payment_status)}>
										{row.payment_status ? formatQueueStatusLabel(row.payment_status) : '—'}
									</OpsStatusPill>
								</td>
								<td className="max-w-[14rem] px-3 py-2 text-sm text-ops-muted">
									{formatRouteSummary(row.origin_name, row.destination_name)}
								</td>
								<BookingsQueueStopNavCell>
									{accountStage != null ? (
										<AccountQueueRowActions
											bookingId={row.id}
											activeStage={accountStage}
											totalAmountZar={amountZar}
											dispatchGate={{ kind: 'unknown' }}
										/>
									) : (
										<span className="text-xs text-ops-muted">—</span>
									)}
								</BookingsQueueStopNavCell>
							</BookingsQueueTableRow>
						)
					})}
				</tbody>
			</OpsTableShell>
		</div>
	)
}
