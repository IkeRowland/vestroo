'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { OpsAccountClientFormDialog } from '@/features/ops/components/OpsAccountClientFormDialog'
import { OpsAvatarCell } from '@/features/ops/components/OpsAvatarCell'
import { OpsDetailRail } from '@/features/ops/components/OpsDetailRail'
import { OpsSplitView } from '@/features/ops/components/OpsSplitView'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsEmptyState, OpsTableShell } from '@/features/ops/components/ops-primitives'
import { opsClientsCopy } from '@/features/ops/copy/ops-clients-copy'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { formatQueueStatusLabel } from '@/lib/ops-bookings-queue-query'
import { buildOpsBookingsAdvancedSearchHref } from '@/lib/ops-booking-grid-query'
import { buildOpsClientsHref } from '@/lib/ops-clients-url'
import type { OpsAccountClientRow } from '@/features/ops/types/ops-account-client'
import { cn } from '@/lib/utils'

export type { OpsAccountClientRow } from '@/features/ops/types/ops-account-client'

export type OpsClientRecentBooking = {
	id: string
	payment_reference: string | null
	status: string | null
	pickup_datetime: string | null
	created_at: string
}

function formatDate(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleDateString()
}

function formatDomains(domains: string[]): string {
	if (domains.length === 0) return opsClientsCopy.noDomains
	if (domains.length === 1) return domains[0]!
	return `${domains[0]!} +${domains.length - 1}`
}

function formatAccountStatusLabel(status: string): string {
	return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function contractSummary(
	starts: string | null,
	ends: string | null,
): string | null {
	const s = starts ? formatDate(starts) : null
	const e = ends ? formatDate(ends) : null
	if (s && e) return opsClientsCopy.detailContract(s, e)
	if (s) return opsClientsCopy.detailContractOpen(s)
	if (e) return opsClientsCopy.detailContractOpenEnd(e)
	return null
}

export type OpsClientsAccountSectionProps = {
	accounts: OpsAccountClientRow[]
	selectedAccountId: string | null
	recentBookings: OpsClientRecentBooking[]
}

export function OpsClientsAccountSection({
	accounts,
	selectedAccountId,
	recentBookings,
}: OpsClientsAccountSectionProps) {
	const router = useRouter()
	const listFocusReturnRef = React.useRef<HTMLTableRowElement | null>(null)
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set())
	const [editDialogOpen, setEditDialogOpen] = React.useState(false)

	const selectedAccount = React.useMemo(
		() => accounts.find((a) => a.id === selectedAccountId) ?? null,
		[accounts, selectedAccountId],
	)

	const detailOpen = Boolean(selectedAccountId && selectedAccount)

	React.useEffect(() => {
		setSelectedIds((prev) => {
			const next = new Set<string>()
			for (const id of prev) {
				if (accounts.some((a) => a.id === id)) next.add(id)
			}
			return next
		})
	}, [accounts])

	React.useEffect(() => {
		if (!selectedAccountId) {
			setEditDialogOpen(false)
		}
	}, [selectedAccountId])

	const allSelected =
		accounts.length > 0 && accounts.every((a) => selectedIds.has(a.id))
	const someSelected = accounts.some((a) => selectedIds.has(a.id))

	const toggleAll = () => {
		if (allSelected) {
			setSelectedIds(new Set())
			return
		}
		setSelectedIds(new Set(accounts.map((a) => a.id)))
	}

	const toggleOne = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const handleCloseDetail = () => {
		const returnId = selectedAccountId
		router.push(buildOpsClientsHref({ id: null }), { scroll: false })
		queueMicrotask(() => {
			const el =
				listFocusReturnRef.current ??
				(returnId
					? (document.querySelector(
							`[data-ops-client-row="${returnId}"]`,
						) as HTMLTableRowElement | null)
					: null)
			el?.focus()
		})
	}

	const openOrToggleAccount = (account: OpsAccountClientRow, rowEl: HTMLTableRowElement) => {
		listFocusReturnRef.current = rowEl
		const next =
			selectedAccountId === account.id ? null : account.id
		router.push(buildOpsClientsHref({ id: next }), { scroll: false })
	}

	if (accounts.length === 0) {
		return (
			<OpsEmptyState
				className="mt-4"
				title={opsClientsCopy.emptyAccountTitle}
				description={opsClientsCopy.emptyAccountDescription}
			/>
		)
	}

	return (
		<OpsSplitView
			className="mt-4"
			detailVisible={detailOpen}
			onCloseDetail={handleCloseDetail}
			listFocusReturnRef={listFocusReturnRef}
			list={
				<div className="min-w-0 space-y-3">
					{selectedIds.size > 0 ? (
						<div
							className="flex flex-wrap items-center gap-3 rounded-lg border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-foreground shadow-ops-1"
							role="status"
						>
							<span className="text-ops-muted">
								{opsClientsCopy.bulkSelectionCount(selectedIds.size)}
							</span>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled
								title={opsClientsCopy.bulkActionsComingSoonTitle}
							>
								{opsClientsCopy.bulkActionsDisabledLabel}
							</Button>
						</div>
					) : null}
					<OpsTableShell caption={opsClientsCopy.tableCaption} tableClassName="text-sm">
						<thead>
							<tr className="border-b border-ops-border text-left text-ops-table-head text-xs uppercase tracking-wide text-ops-muted">
								<th scope="col" className="w-10 px-2 py-2 font-medium">
									<input
										type="checkbox"
										className="h-4 w-4 rounded border-ops-border bg-ops-canvas text-primary focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas"
										checked={allSelected}
										ref={(el) => {
											if (el) el.indeterminate = someSelected && !allSelected
										}}
										aria-label={opsClientsCopy.columnSelectAll}
										onChange={toggleAll}
									/>
								</th>
								<th scope="col" className="px-2 py-2 font-medium">
									{opsClientsCopy.columnClient}
								</th>
								<th scope="col" className="px-2 py-2 font-medium">
									{opsClientsCopy.columnDomains}
								</th>
								<th scope="col" className="px-2 py-2 font-medium">
									{opsClientsCopy.columnPhone}
								</th>
								<th scope="col" className="px-2 py-2 font-medium">
									{opsClientsCopy.columnTier}
								</th>
								<th scope="col" className="px-2 py-2 font-medium">
									{opsClientsCopy.columnCredit}
								</th>
								<th scope="col" className="px-2 py-2 font-medium">
									{opsClientsCopy.columnStatus}
								</th>
								<th scope="col" className="px-2 py-2 font-medium">
									{opsClientsCopy.columnDocuments}
								</th>
								<th scope="col" className="px-2 py-2 font-medium">
									{opsClientsCopy.columnActions}
								</th>
							</tr>
						</thead>
						<tbody className="text-ops-foreground">
							{accounts.map((a) => {
								const isSelected = selectedAccountId === a.id
								const searchHref = buildOpsBookingsAdvancedSearchHref({ q: a.name })
								return (
									<tr
										key={a.id}
										data-ops-client-row={a.id}
										data-testid="ops-clients-account-row"
										tabIndex={0}
										aria-label={opsClientsCopy.openProfileAria(a.name)}
										className={cn(
											'cursor-pointer border-b border-ops-border/80 align-top transition-colors outline-none hover:bg-ops-accent-soft focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
											isSelected ? 'bg-ops-accent-soft' : null,
										)}
										onClick={(e) => {
											if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
												return
											}
											if ((e.target as HTMLElement).closest('a')) {
												return
											}
											openOrToggleAccount(a, e.currentTarget)
										}}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												if ((e.target as HTMLElement).closest('a')) return
												if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return
												e.preventDefault()
												openOrToggleAccount(a, e.currentTarget)
											}
										}}
									>
										<td className="px-2 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
											<input
												type="checkbox"
												className="h-4 w-4 rounded border-ops-border bg-ops-canvas text-primary focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas"
												checked={selectedIds.has(a.id)}
												aria-label={opsClientsCopy.rowCheckboxAria(a.name)}
												onChange={() => toggleOne(a.id)}
												onClick={(e) => e.stopPropagation()}
											/>
										</td>
										<td className="max-w-[14rem] px-2 py-2 align-middle">
											<OpsAvatarCell
												src={null}
												name={a.name}
												secondary={a.slug}
											/>
										</td>
										<td className="max-w-[12rem] truncate px-2 py-2 align-middle text-xs text-ops-muted">
											{formatDomains(a.authorized_email_domains)}
										</td>
										<td
											className="whitespace-nowrap px-2 py-2 align-middle text-xs text-ops-muted"
											title={opsClientsCopy.phoneNotOnFileNote}
										>
											{opsClientsCopy.phoneNotOnFile}
										</td>
										<td className="px-2 py-2 align-middle">
											<OpsStatusPill tone="neutral" dot={false}>
												{opsClientsCopy.engagementTierLabel}
											</OpsStatusPill>
										</td>
										<td className="whitespace-nowrap px-2 py-2 align-middle tabular-nums text-sm">
											{a.credit_terms_days}d
										</td>
										<td className="px-2 py-2 align-middle">
											<OpsStatusPill tone={getOpsStatusPillTone(a.status)}>
												{formatAccountStatusLabel(a.status)}
											</OpsStatusPill>
										</td>
										<td className="px-2 py-2 align-middle text-xs text-ops-muted">
											{opsClientsCopy.documentsPlaceholder}
										</td>
										<td className="px-2 py-2 align-middle text-xs" onClick={(e) => e.stopPropagation()}>
											<Link
												href={searchHref}
												className="text-primary underline-offset-2 hover:underline"
											>
												{opsClientsCopy.searchBookings}
											</Link>
										</td>
									</tr>
								)
							})}
						</tbody>
					</OpsTableShell>
				</div>
			}
			detail={
				selectedAccount ? (
					<OpsDetailRail
						title={selectedAccount.name}
						onClose={handleCloseDetail}
					>
						<div className="space-y-6">
							<div className="flex justify-end">
								<Button type="button" size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
									{opsClientsCopy.detailEditButton}
								</Button>
							</div>
							{editDialogOpen ? (
								<OpsAccountClientFormDialog
									mode="edit"
									account={selectedAccount}
									onClose={() => setEditDialogOpen(false)}
								/>
							) : null}
							<section aria-labelledby="ops-client-engagement-heading">
								<h3
									id="ops-client-engagement-heading"
									className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
								>
									{opsClientsCopy.detailEngagementHeading}
								</h3>
								<div className="mt-2 flex flex-wrap gap-2">
									<OpsStatusPill tone="neutral" dot={false}>
										{opsClientsCopy.engagementTierLabel}
									</OpsStatusPill>
								</div>
								<p className="mt-2 text-xs text-ops-muted">
									{opsClientsCopy.detailEngagementPlaceholder}
								</p>
							</section>

							<section aria-labelledby="ops-client-contact-heading">
								<h3
									id="ops-client-contact-heading"
									className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
								>
									{opsClientsCopy.detailContactHeading}
								</h3>
								<dl className="mt-2 space-y-2 text-sm">
									<div>
										<dt className="text-ops-muted">Slug</dt>
										<dd className="font-mono text-xs text-ops-foreground">{selectedAccount.slug}</dd>
									</div>
									<div>
										<dt className="text-ops-muted">Approved email domains</dt>
										<dd className="text-ops-foreground">
											{selectedAccount.authorized_email_domains.length === 0
												? opsClientsCopy.noDomains
												: selectedAccount.authorized_email_domains.join(', ')}
										</dd>
									</div>
									<div>
										<dt className="text-ops-muted">Account status</dt>
										<dd className="mt-1">
											<OpsStatusPill tone={getOpsStatusPillTone(selectedAccount.status)}>
												{formatAccountStatusLabel(selectedAccount.status)}
											</OpsStatusPill>
										</dd>
									</div>
								</dl>
							</section>

							<section aria-labelledby="ops-client-billing-heading">
								<h3
									id="ops-client-billing-heading"
									className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
								>
									{opsClientsCopy.detailBillingHeading}
								</h3>
								<dl className="mt-2 space-y-2 text-sm">
									<div>
										<dt className="text-ops-muted">Credit terms</dt>
										<dd className="text-ops-foreground">
											{opsClientsCopy.detailCreditTerms(selectedAccount.credit_terms_days)}
										</dd>
									</div>
									{selectedAccount.credit_limit_zar != null &&
									Number.isFinite(selectedAccount.credit_limit_zar) ? (
										<div>
											<dt className="text-ops-muted">Credit limit (ZAR)</dt>
											<dd className="tabular-nums text-ops-foreground">
												{selectedAccount.credit_limit_zar.toLocaleString()}
											</dd>
										</div>
									) : null}
									{contractSummary(
										selectedAccount.contract_starts_on,
										selectedAccount.contract_ends_on,
									) ? (
										<div>
											<dt className="text-ops-muted">Contract window</dt>
											<dd className="text-ops-foreground">
												{contractSummary(
													selectedAccount.contract_starts_on,
													selectedAccount.contract_ends_on,
												)}
											</dd>
										</div>
									) : null}
									<div>
										<dt className="text-ops-muted">Created</dt>
										<dd className="text-ops-foreground">{formatDate(selectedAccount.created_at)}</dd>
									</div>
								</dl>
							</section>

							<section aria-labelledby="ops-client-bookings-heading">
								<h3
									id="ops-client-bookings-heading"
									className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
								>
									{opsClientsCopy.detailRecentHeading}
								</h3>
								{recentBookings.length === 0 ? (
									<p className="mt-2 text-sm text-ops-muted">{opsClientsCopy.noRecentBookings}</p>
								) : (
									<ul className="mt-2 space-y-2">
										{recentBookings.map((b) => (
											<li key={b.id} className="text-sm">
												<Link
													href={`/ops/bookings/${encodeURIComponent(b.id)}`}
													className="font-medium text-primary underline-offset-2 hover:underline"
												>
													{b.payment_reference?.trim() || `${b.id.slice(0, 8)}…`}
												</Link>
												<span className="text-ops-muted">
													{' '}
													·{' '}
													{b.status ? formatQueueStatusLabel(b.status) : '—'}
													{' · '}
													{formatDate(b.pickup_datetime ?? b.created_at)}
												</span>
											</li>
										))}
									</ul>
								)}
							</section>

							<section aria-labelledby="ops-client-docs-heading">
								<h3
									id="ops-client-docs-heading"
									className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
								>
									{opsClientsCopy.detailDocumentsHeading}
								</h3>
								<p className="mt-2 text-sm text-ops-muted">
									{opsClientsCopy.detailDocumentsPlaceholder}
								</p>
							</section>
						</div>
					</OpsDetailRail>
				) : null
			}
		/>
	)
}
