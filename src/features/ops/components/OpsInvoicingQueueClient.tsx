'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { markInvoicedAction, markPaidAction } from '@/actions/opsInvoicingHooks'
import { OpsAvatarCell } from '@/features/ops/components/OpsAvatarCell'
import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
import { OpsPagination } from '@/features/ops/components/OpsPagination'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsTableShell } from '@/features/ops/components/OpsTableShell'
import { opsInvoicingCopy } from '@/features/ops/copy/ops-invoicing-copy'
import { getBookingsQueueStatusPillTone } from '@/features/ops/lib/ops-bookings-queue-pill-tones'
import type { OpsPaginationPerPage } from '@/features/ops/lib/ops-pagination-url'
import { invoicingRowIsOverdue } from '@/lib/ops-invoicing-kpis'
import {
	buildInvoicingQueueCsv,
	type OpsInvoicingQueueRow,
	type OpsInvoicingSortKey,
	sortInvoicingQueueRows,
} from '@/lib/ops-invoicing-queue'
import { OPS_INVOICING_PATH, serializeOpsInvoicingPaginationQuery } from '@/lib/ops-invoicing-url'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type OpsInvoicingQueueClientProps = {
	mode: 'ready' | 'invoiced'
	rows: OpsInvoicingQueueRow[]
	fetchError: string | null
	page: number
	per: OpsPaginationPerPage
	totalPages: number
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

function formatIsoDisplay(iso: string | null): string {
	if (!iso) return '—'
	const ms = Date.parse(iso)
	if (Number.isNaN(ms)) return iso
	return new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + 'Z'
}

function sortLabel(key: OpsInvoicingSortKey): string {
	switch (key) {
		case 'due_date':
			return 'Due date'
		case 'booking_reference':
			return 'Reference'
		case 'customer_account':
			return 'Account'
		case 'total_amount':
			return 'Total'
		case 'trip_completed_at':
			return 'Trip completed'
		case 'purchase_order_ref':
			return 'PO ref'
		case 'credit_terms_days':
			return 'Credit days'
		default:
			return key
	}
}

const HEADER_SORT_KEYS: readonly OpsInvoicingSortKey[] = [
	'due_date',
	'booking_reference',
	'customer_account',
	'total_amount',
	'trip_completed_at',
	'purchase_order_ref',
	'credit_terms_days',
]

export function OpsInvoicingQueueClient({
	mode,
	rows,
	fetchError,
	page,
	per,
	totalPages,
}: OpsInvoicingQueueClientProps) {
	const router = useRouter()
	const [sortKey, setSortKey] = useState<OpsInvoicingSortKey>('due_date')
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
	const [refByBooking, setRefByBooking] = useState<Record<string, string>>({})
	const [rowError, setRowError] = useState<{
		bookingId: string
		message: string
		correlationId?: string
	} | null>(null)
	const [busyBookingId, setBusyBookingId] = useState<string | null>(null)

	const sortedRows = useMemo(
		() => sortInvoicingQueueRows(rows, sortKey, sortDir),
		[rows, sortKey, sortDir],
	)

	const pageRows = useMemo(() => {
		const start = (page - 1) * per
		return sortedRows.slice(start, start + per)
	}, [sortedRows, page, per])

	useEffect(() => {
		setSortKey('due_date')
		setSortDir('asc')
	}, [mode])

	const csvText = useMemo(() => buildInvoicingQueueCsv(sortedRows), [sortedRows])

	const paginationQuery = serializeOpsInvoicingPaginationQuery({
		tab: mode,
		page,
		per,
	})

	function onHeaderClick(key: OpsInvoicingSortKey) {
		if (sortKey === key) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
		} else {
			setSortKey(key)
			setSortDir('asc')
		}
	}

	async function copyCsv() {
		try {
			await navigator.clipboard.writeText(csvText)
		} catch {
			// Clipboard may be denied — fall through silently; user can use Export.
		}
	}

	function exportCsv() {
		const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `invoicing-${mode}-${new Date().toISOString().slice(0, 10)}.csv`
		a.click()
		URL.revokeObjectURL(url)
	}

	async function runMarkInvoiced(bookingId: string) {
		setRowError(null)
		const externalInvoiceRef = refByBooking[bookingId]?.trim() || null
		setBusyBookingId(bookingId)
		try {
			const res = await markInvoicedAction({ bookingId, externalInvoiceRef })
			if (!res.ok) {
				setRowError({
					bookingId,
					message: res.error.message,
					correlationId: res.error.correlationId,
				})
				return
			}
			setRefByBooking((m) => {
				const next = { ...m }
				delete next[bookingId]
				return next
			})
			router.refresh()
		} finally {
			setBusyBookingId(null)
		}
	}

	async function runMarkPaid(bookingId: string) {
		setRowError(null)
		setBusyBookingId(bookingId)
		try {
			const res = await markPaidAction({ bookingId })
			if (!res.ok) {
				setRowError({
					bookingId,
					message: res.error.message,
					correlationId: res.error.correlationId,
				})
				return
			}
			router.refresh()
		} finally {
			setBusyBookingId(null)
		}
	}

	if (fetchError) {
		return (
			<OpsErrorState
				title={opsInvoicingCopy.fetchErrorTitle}
				message={fetchError}
				sanitizeMessage={false}
				onRetry={() => router.refresh()}
				secondaryAction={{ label: 'Back to trips', href: '/ops/trips' }}
			/>
		)
	}

	const pipelineStatusKey = mode === 'ready' ? 'ready_to_invoice' : 'invoiced'

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void copyCsv()}
					aria-label={opsInvoicingCopy.copyCsvAria}
				>
					Copy as CSV
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={exportCsv}
					aria-label={opsInvoicingCopy.exportCsvAria}
				>
					Export visible rows
				</Button>
				<p className="text-xs text-ops-muted">
					{opsInvoicingCopy.sortToolbarHint(sortLabel(sortKey), sortDir)}
				</p>
			</div>

			{rowError ? (
				<div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-ops-foreground">
					<p className="font-medium">Action failed</p>
					<p>{rowError.message}</p>
					{rowError.correlationId ?
						<p className="mt-1 font-mono text-xs text-ops-muted">Ref: {rowError.correlationId}</p>
					:	null}
				</div>
			) : null}

			{sortedRows.length === 0 ?
				<div
					className="rounded-lg border border-ops-border bg-ops-surface/50 p-4 text-sm text-ops-foreground"
					role="status"
				>
					<p className="font-medium text-ops-foreground">
						{mode === 'ready' ?
							opsInvoicingCopy.emptyReadyTitle
						:	opsInvoicingCopy.emptyInvoicedTitle}
					</p>
					<p className="mt-2 text-ops-muted">
						{mode === 'ready' ?
							opsInvoicingCopy.emptyReadyBody
						:	opsInvoicingCopy.emptyInvoicedBody}
					</p>
				</div>
			:	<>
					<OpsTableShell caption={opsInvoicingCopy.tableCaption}>
						<thead>
							<tr className="border-b border-ops-border bg-ops-surface/40 text-xs uppercase tracking-wide text-ops-muted">
								<th scope="col" className="px-3 py-2 font-medium">
									Status
								</th>
								{HEADER_SORT_KEYS.map((key) => (
									<th key={key} scope="col" className="px-3 py-2 font-medium">
										<button
											type="button"
											className={cn(
												'inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-ops-surface',
												sortKey === key ? 'text-ops-foreground' : '',
											)}
											onClick={() => onHeaderClick(key)}
										>
											{sortLabel(key)}
											{sortKey === key ?
												<span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
											:	null}
										</button>
									</th>
								))}
								<th scope="col" className="px-3 py-2 font-medium">
									External ref
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{pageRows.map((row) => {
								const overdue = mode === 'invoiced' && invoicingRowIsOverdue(row)
								return (
									<tr
										key={row.bookingId}
										className={cn(
											'border-b border-ops-border/60 align-top text-sm transition-colors',
											'hover:bg-ops-accent-soft',
										)}
										aria-label={opsInvoicingCopy.rowBookingAria(row.bookingReference)}
									>
										<td className="px-3 py-2">
											<div className="flex flex-wrap items-center gap-1.5">
												<OpsStatusPill tone={getBookingsQueueStatusPillTone(pipelineStatusKey)}>
													{mode === 'ready' ?
														opsInvoicingCopy.statusReadyLabel
													:	opsInvoicingCopy.statusInvoicedLabel}
												</OpsStatusPill>
												{overdue ?
													<OpsStatusPill tone="danger">
														{opsInvoicingCopy.statusOverdueLabel}
													</OpsStatusPill>
												:	null}
											</div>
										</td>
										<td className="px-3 py-2 font-mono text-xs">{row.dueDateYmd ?? '—'}</td>
										<td className="px-3 py-2 font-mono text-xs">{row.bookingReference}</td>
										<td className="max-w-[16rem] px-3 py-2">
											<OpsAvatarCell
												src={null}
												name={row.customerAccountDisplayName}
												secondary={row.purchaseOrderRef?.trim() ? row.purchaseOrderRef : null}
											/>
										</td>
										<td className="px-3 py-2">{formatZar(row.totalAmount)}</td>
										<td className="px-3 py-2 font-mono text-xs">{formatIsoDisplay(row.tripCompletedAtIso)}</td>
										<td className="px-3 py-2">{row.purchaseOrderRef ?? '—'}</td>
										<td className="px-3 py-2 text-right tabular-nums">{row.creditTermsDays}</td>
										<td className="px-3 py-2">
											{mode === 'ready' ?
												<input
													className="w-full min-w-[6rem] max-w-[12rem] rounded border border-ops-border bg-ops-surface px-2 py-1 text-xs text-ops-foreground"
													placeholder="Optional"
													value={refByBooking[row.bookingId] ?? ''}
													onChange={(ev) =>
														setRefByBooking((m) => ({ ...m, [row.bookingId]: ev.target.value }))
													}
													maxLength={240}
													aria-label={`External invoice ref for ${row.bookingReference}`}
												/>
											:	<span className="text-xs text-ops-muted">{row.externalInvoiceRef ?? '—'}</span>}
										</td>
										<td className="px-3 py-2">
											{mode === 'ready' ?
												<Button
													type="button"
													size="sm"
													disabled={busyBookingId === row.bookingId}
													onClick={() => void runMarkInvoiced(row.bookingId)}
												>
													{busyBookingId === row.bookingId ? 'Saving…' : 'Mark invoiced'}
												</Button>
											:	<Button
													type="button"
													size="sm"
													disabled={busyBookingId === row.bookingId}
													onClick={() => void runMarkPaid(row.bookingId)}
												>
													{busyBookingId === row.bookingId ? 'Saving…' : 'Mark paid'}
												</Button>}
										</td>
									</tr>
								)
							})}
						</tbody>
					</OpsTableShell>
					<OpsPagination
						pathname={OPS_INVOICING_PATH}
						query={paginationQuery}
						currentPage={page}
						totalPages={totalPages}
						totalCount={sortedRows.length}
						perPage={per}
					/>
				</>
			}
		</div>
	)
}
