'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { upsertReferrerAction, type ReferrerUpsertInput } from '@/actions/referrerOps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import { opsReferralsCopy } from '@/features/ops/copy/ops-referrals-copy'
import type { ReferrerRow } from '@/lib/referrer-types'
import { formatReferrerLabel } from '@/lib/referrer-types'
import type { ReferredBookingRow } from '@/lib/ops-referrals-fetch'
import { formatQueueStatusLabel } from '@/lib/ops-bookings-queue-query'

const C = opsReferralsCopy

type Props = {
	referrers: ReferrerRow[]
	referredBookings: ReferredBookingRow[]
	bookingCounts: Record<string, number>
}

function formatZar(amount: number | null): string {
	if (amount == null || Number.isNaN(amount)) return '—'
	return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

function referrerEmbedLabel(raw: ReferredBookingRow['referrers']): string {
	if (!raw || typeof raw !== 'object') return '—'
	const obj = Array.isArray(raw) ? raw[0] : raw
	if (!obj || typeof obj !== 'object') return '—'
	const name = (obj as { name?: unknown }).name
	const code = (obj as { code?: unknown }).code
	if (typeof name !== 'string') return '—'
	return formatReferrerLabel({
		name,
		code: typeof code === 'string' ? code : null,
	})
}

export function OpsReferralsClient({ referrers, referredBookings, bookingCounts }: Props) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()
	const [editingId, setEditingId] = useState<string | null>(null)
	const [formOpen, setFormOpen] = useState(false)
	const [name, setName] = useState('')
	const [code, setCode] = useState('')
	const [email, setEmail] = useState('')
	const [status, setStatus] = useState<'active' | 'inactive'>('active')
	const [commissionRate, setCommissionRate] = useState('')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const resetForm = () => {
		setEditingId(null)
		setName('')
		setCode('')
		setEmail('')
		setStatus('active')
		setCommissionRate('')
		setErrorMessage(null)
	}

	const openCreate = () => {
		resetForm()
		setFormOpen(true)
	}

	const openEdit = (row: ReferrerRow) => {
		setEditingId(row.id)
		setName(row.name)
		setCode(row.code ?? '')
		setEmail(row.email ?? '')
		setStatus(row.status)
		setCommissionRate(row.commission_rate != null ? String(row.commission_rate) : '')
		setErrorMessage(null)
		setFormOpen(true)
	}

	const submit = () => {
		setErrorMessage(null)
		const payload: ReferrerUpsertInput = {
			id: editingId ?? undefined,
			name,
			code,
			email,
			status,
			commissionRate,
		}
		startTransition(async () => {
			const res = await upsertReferrerAction(payload)
			if (!res.ok) {
				setErrorMessage(res.message)
				return
			}
			setFormOpen(false)
			resetForm()
			router.refresh()
		})
	}

	return (
		<div className="space-y-8">
			<section className="space-y-4" aria-labelledby="ops-referrers-heading">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 id="ops-referrers-heading" className="text-lg font-semibold text-ops-foreground">
						{C.referrersSectionTitle}
					</h2>
					<Button type="button" size="sm" onClick={openCreate}>
						{C.newReferrer}
					</Button>
				</div>

				{formOpen ? (
					<div className="max-w-xl space-y-4 rounded-lg border border-ops-border bg-ops-surface/40 p-4">
						<h3 className="text-sm font-semibold text-ops-foreground">
							{editingId ? C.editReferrer : C.newReferrer}
						</h3>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1 sm:col-span-2">
								<label className="text-xs font-medium text-ops-muted" htmlFor="ref-name">
									{C.fieldName}
								</label>
								<Input id="ref-name" value={name} onChange={(e) => setName(e.target.value)} />
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-ops-muted" htmlFor="ref-code">
									{C.fieldCode}
								</label>
								<Input id="ref-code" value={code} onChange={(e) => setCode(e.target.value)} />
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-ops-muted" htmlFor="ref-email">
									{C.fieldEmail}
								</label>
								<Input
									id="ref-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-ops-muted" htmlFor="ref-status">
									{C.fieldStatus}
								</label>
								<Select
									id="ref-status"
									value={status}
									onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
								>
									<option value="active">{C.statusActive}</option>
									<option value="inactive">{C.statusInactive}</option>
								</Select>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-ops-muted" htmlFor="ref-commission">
									{C.fieldCommission}
								</label>
								<Input
									id="ref-commission"
									inputMode="decimal"
									value={commissionRate}
									onChange={(e) => setCommissionRate(e.target.value)}
								/>
							</div>
						</div>
						{errorMessage ? (
							<p className="text-sm text-destructive" role="alert">
								{errorMessage}
							</p>
						) : null}
						<div className="flex flex-wrap gap-2">
							<Button type="button" size="sm" disabled={pending} onClick={submit}>
								{C.saveReferrer}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={pending}
								onClick={() => {
									setFormOpen(false)
									resetForm()
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : null}

				{referrers.length === 0 ? (
					<p className="text-sm text-ops-muted">{C.emptyReferrers}</p>
				) : (
					<OpsTableShell caption="Referrers">
						<thead className="border-b border-ops-border bg-ops-surface/60 text-xs uppercase tracking-wide text-ops-muted">
							<tr>
								<th className="px-3 py-2 font-medium">{C.tableReferrer}</th>
								<th className="px-3 py-2 font-medium">{C.fieldCode}</th>
								<th className="px-3 py-2 font-medium">{C.fieldStatus}</th>
								<th className="px-3 py-2 font-medium">{C.tableBookings}</th>
								<th className="px-3 py-2 font-medium" />
							</tr>
						</thead>
						<tbody>
							{referrers.map((r) => (
								<tr key={r.id} className="border-b border-ops-border/60">
									<td className="px-3 py-2 text-sm text-ops-foreground">{r.name}</td>
									<td className="px-3 py-2 font-mono text-xs text-ops-muted">{r.code ?? '—'}</td>
									<td className="px-3 py-2 text-sm capitalize text-ops-muted">{r.status}</td>
									<td className="px-3 py-2 text-sm tabular-nums text-ops-foreground">
										{bookingCounts[r.id] ?? 0}
									</td>
									<td className="px-3 py-2 text-right">
										<Button type="button" size="sm" variant="outline" onClick={() => openEdit(r)}>
											Edit
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</OpsTableShell>
				)}
			</section>

			<section className="space-y-4" aria-labelledby="ops-referred-bookings-heading">
				<h2 id="ops-referred-bookings-heading" className="text-lg font-semibold text-ops-foreground">
					{C.referredBookingsTitle}
				</h2>
				{referredBookings.length === 0 ? (
					<p className="text-sm text-ops-muted">{C.emptyReferred}</p>
				) : (
					<OpsTableShell caption="Referred bookings">
						<thead className="border-b border-ops-border bg-ops-surface/60 text-xs uppercase tracking-wide text-ops-muted">
							<tr>
								<th className="px-3 py-2 font-medium">{C.tableReference}</th>
								<th className="px-3 py-2 font-medium">{C.tableReferrer}</th>
								<th className="px-3 py-2 font-medium">{C.tableCustomer}</th>
								<th className="px-3 py-2 font-medium">{C.tablePickup}</th>
								<th className="px-3 py-2 font-medium">{C.tableStatus}</th>
								<th className="px-3 py-2 font-medium">{C.tableAmount}</th>
							</tr>
						</thead>
						<tbody>
							{referredBookings.map((b) => {
								const refLabel = b.payment_reference ?? `${b.id.slice(0, 8)}…`
								return (
									<tr key={b.id} className="border-b border-ops-border/60">
										<td className="px-3 py-2">
											<Link
												href={`/ops/bookings/${encodeURIComponent(b.id)}`}
												className="font-mono text-xs text-primary underline-offset-2 hover:underline"
											>
												{refLabel}
											</Link>
										</td>
										<td className="px-3 py-2 text-sm text-ops-foreground">
											{referrerEmbedLabel(b.referrers)}
										</td>
										<td className="px-3 py-2 text-sm text-ops-muted">{b.customer_name ?? '—'}</td>
										<td className="px-3 py-2 text-sm text-ops-muted">
											{b.pickup_datetime
												? new Date(b.pickup_datetime).toLocaleString('en-ZA', {
														timeZone: 'UTC',
													})
												: '—'}
										</td>
										<td className="px-3 py-2 text-sm text-ops-muted">
											{b.status ? formatQueueStatusLabel(b.status) : '—'}
										</td>
										<td className="px-3 py-2 text-sm tabular-nums text-ops-foreground">
											{formatZar(b.total_amount)}
										</td>
									</tr>
								)
							})}
						</tbody>
					</OpsTableShell>
				)}
			</section>
		</div>
	)
}
