'use client'

import Link from 'next/link'
import { useState } from 'react'

import { OpsAccountClientFormDialog } from '@/features/ops/components/OpsAccountClientFormDialog'
import { OpsAccountClientBookingsTable } from '@/features/ops/components/OpsAccountClientBookingsTable'
import { OpsBookingsQueueFilters } from '@/features/ops/components/OpsBookingsQueueFilters'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsEmptyState } from '@/features/ops/components/ops-primitives'
import { opsAccountClientDetailCopy } from '@/features/ops/copy/ops-account-client-detail-copy'
import { opsClientsCopy } from '@/features/ops/copy/ops-clients-copy'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import type { OpsAccountClientRow } from '@/features/ops/types/ops-account-client'
import type { OpsBookingsQueueRow } from '@/lib/ops-bookings-queue-select'
import type { OpsBookingsQueueParsed } from '@/lib/ops-bookings-queue-query'
import { OPS_CLIENTS_PATH } from '@/lib/ops-clients-url'
import { Button } from '@/components/ui/button'

function formatDate(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleDateString()
}

function formatAccountStatusLabel(status: string): string {
	return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function contractSummary(starts: string | null, ends: string | null): string | null {
	const s = starts ? formatDate(starts) : null
	const e = ends ? formatDate(ends) : null
	if (s && e) return opsClientsCopy.detailContract(s, e)
	if (s) return opsClientsCopy.detailContractOpen(s)
	if (e) return opsClientsCopy.detailContractOpenEnd(e)
	return null
}

export type OpsAccountClientDetailShellProps = {
	account: OpsAccountClientRow
	bookings: OpsBookingsQueueRow[]
	queueParsed: OpsBookingsQueueParsed
	detailPath: string
}

export function OpsAccountClientDetailShell({
	account,
	bookings,
	queueParsed,
	detailPath,
}: OpsAccountClientDetailShellProps) {
	const [editOpen, setEditOpen] = useState(false)

	return (
		<div className="min-w-0 max-w-full space-y-8">
			<p>
				<Link
					href={OPS_CLIENTS_PATH}
					className="text-sm text-primary underline-offset-2 hover:underline"
				>
					{opsAccountClientDetailCopy.backToClients}
				</Link>
			</p>

			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-ops-foreground">{account.name}</h1>
					<p className="mt-1 font-mono text-sm text-ops-muted">{account.slug}</p>
				</div>
				<Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
					{opsClientsCopy.detailEditButton}
				</Button>
			</header>

			{editOpen ? (
				<OpsAccountClientFormDialog mode="edit" account={account} onClose={() => setEditOpen(false)} />
			) : null}

			<section className="grid gap-6 lg:grid-cols-2">
				<div className="rounded-lg border border-ops-border bg-ops-surface p-4">
					<h2 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
						{opsClientsCopy.detailContactHeading}
					</h2>
					<dl className="mt-3 space-y-2 text-sm">
						<div>
							<dt className="text-ops-muted">Approved domains</dt>
							<dd>
								{account.authorized_email_domains.length === 0
									? opsClientsCopy.noDomains
									: account.authorized_email_domains.join(', ')}
							</dd>
						</div>
						<div>
							<dt className="text-ops-muted">Status</dt>
							<dd className="mt-1">
								<OpsStatusPill tone={getOpsStatusPillTone(account.status)}>
									{formatAccountStatusLabel(account.status)}
								</OpsStatusPill>
							</dd>
						</div>
					</dl>
				</div>

				<div className="rounded-lg border border-ops-border bg-ops-surface p-4">
					<h2 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
						{opsClientsCopy.detailBillingHeading}
					</h2>
					<dl className="mt-3 space-y-2 text-sm">
						<div>
							<dt className="text-ops-muted">Credit terms</dt>
							<dd>{opsClientsCopy.detailCreditTerms(account.credit_terms_days)}</dd>
						</div>
						{account.credit_limit_zar != null && Number.isFinite(account.credit_limit_zar) ? (
							<div>
								<dt className="text-ops-muted">Credit limit (ZAR)</dt>
								<dd className="tabular-nums">{account.credit_limit_zar.toLocaleString()}</dd>
							</div>
						) : null}
						{contractSummary(account.contract_starts_on, account.contract_ends_on) ? (
							<div>
								<dt className="text-ops-muted">Contract</dt>
								<dd>
									{contractSummary(account.contract_starts_on, account.contract_ends_on)}
								</dd>
							</div>
						) : null}
					</dl>
				</div>
			</section>

			<section aria-labelledby="account-client-bookings-heading">
				<h2
					id="account-client-bookings-heading"
					className="text-lg font-semibold text-ops-foreground"
				>
					{opsAccountClientDetailCopy.bookingsHeading}
				</h2>
				<p className="mt-1 text-sm text-ops-muted">
					{opsAccountClientDetailCopy.bookingsDescription}
				</p>

				<div className="mt-4 overflow-hidden rounded-lg border border-ops-border">
					<OpsBookingsQueueFilters
						parsed={queueParsed}
						className="rounded-none border-0"
						pathname={detailPath}
						clearHref={detailPath}
						hideClientFilter
					/>
				</div>

				{bookings.length === 0 ? (
					<OpsEmptyState
						className="mt-4"
						title={opsAccountClientDetailCopy.noBookingsTitle}
						description={opsAccountClientDetailCopy.noBookingsDescription}
					/>
				) : (
					<div className="mt-4">
						<OpsAccountClientBookingsTable accountId={account.id} rows={bookings} />
					</div>
				)}
			</section>
		</div>
	)
}
