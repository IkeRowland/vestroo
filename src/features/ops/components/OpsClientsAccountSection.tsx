'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { OpsAvatarCell } from '@/features/ops/components/OpsAvatarCell'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsEmptyState, OpsTableShell } from '@/features/ops/components/ops-primitives'
import { opsClientsCopy } from '@/features/ops/copy/ops-clients-copy'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { buildOpsBookingsAdvancedSearchHref } from '@/lib/ops-booking-grid-query'
import { opsAccountClientDetailPath } from '@/lib/ops-clients-account-url'
import type { OpsAccountClientRow } from '@/features/ops/types/ops-account-client'
import { cn } from '@/lib/utils'

export type { OpsAccountClientRow } from '@/features/ops/types/ops-account-client'

function formatDomains(domains: string[]): string {
	if (domains.length === 0) return opsClientsCopy.noDomains
	if (domains.length === 1) return domains[0]!
	return `${domains[0]!} +${domains.length - 1}`
}

function formatAccountStatusLabel(status: string): string {
	return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export type OpsClientsAccountSectionProps = {
	accounts: OpsAccountClientRow[]
}

export function OpsClientsAccountSection({ accounts }: OpsClientsAccountSectionProps) {
	const router = useRouter()
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set())

	React.useEffect(() => {
		setSelectedIds((prev) => {
			const next = new Set<string>()
			for (const id of prev) {
				if (accounts.some((a) => a.id === id)) next.add(id)
			}
			return next
		})
	}, [accounts])

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

	const openAccount = (account: OpsAccountClientRow) => {
		router.push(opsAccountClientDetailPath(account.id))
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
		<div className="mt-4 min-w-0 space-y-3">
			{selectedIds.size > 0 ? (
				<div
					className="flex flex-wrap items-center gap-3 rounded-lg border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-foreground shadow-ops-1"
					role="status"
				>
					<span className="text-ops-muted">
						{opsClientsCopy.bulkSelectionCount(selectedIds.size)}
					</span>
					<span className="text-xs text-ops-muted">{opsClientsCopy.bulkActionsComingSoonTitle}</span>
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
								)}
								onClick={(e) => {
									if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
										return
									}
									if ((e.target as HTMLElement).closest('a')) {
										return
									}
									openAccount(a)
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										if ((e.target as HTMLElement).closest('a')) return
										if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return
										e.preventDefault()
										openAccount(a)
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
									<OpsAvatarCell src={null} name={a.name} secondary={a.slug} />
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
	)
}
