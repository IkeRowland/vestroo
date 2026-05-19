'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useId, useState, useTransition } from 'react'

import { saveAccountBookingQuoteDraft, sendAccountBookingQuote } from '@/actions/sendAccountBookingQuote'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BookingQuoteLineItem } from '@/types/booking-quote'

type Row = { key: string; label: string; qty: string; unitZar: string }

function newRowKey(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function parseMoney(raw: string): number | null {
	const t = raw.trim().replace(/\s/g, '').replace(',', '.')
	if (t === '') return null
	const n = Number(t)
	if (!Number.isFinite(n)) return null
	return Math.round(n * 100) / 100
}

function rowsToLineItems(rows: Row[]): BookingQuoteLineItem[] {
	const out: BookingQuoteLineItem[] = []
	for (const r of rows) {
		const label = r.label.trim()
		if (label === '') continue
		const qtyN = Math.max(1, Math.floor(Number(r.qty)) || 1)
		const unit = parseMoney(r.unitZar)
		if (unit == null || unit < 0) continue
		const total = Math.round(qtyN * unit * 100) / 100
		if (total <= 0) continue
		out.push({
			label,
			qty: qtyN,
			unit_zar: unit,
			total_zar: total,
		})
	}
	return out
}

type AccountQuoteSendFormProps = {
	bookingId: string
	defaultFirstLineLabel: string
	/** When `pending_confirmation`, offers **Save draft** without emailing. */
	bookingStatus?: string | null
}

export function AccountQuoteSendForm({
	bookingId,
	defaultFirstLineLabel,
	bookingStatus = null,
}: AccountQuoteSendFormProps) {
	const router = useRouter()
	const baseId = useId()
	const [pending, startTransition] = useTransition()
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [rows, setRows] = useState<Row[]>(() => [
		{ key: `${baseId}-0`, label: defaultFirstLineLabel, qty: '1', unitZar: '' },
	])

	const addRow = useCallback(() => {
		setRows((prev) => [...prev, { key: newRowKey(), label: '', qty: '1', unitZar: '' }])
	}, [])

	const removeRow = useCallback((key: string) => {
		setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)))
	}, [])

	const updateRow = useCallback((key: string, patch: Partial<Pick<Row, 'label' | 'qty' | 'unitZar'>>) => {
		setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
	}, [])

	const computedTotal = rows.reduce((acc, r) => {
		const qtyN = Math.max(1, Math.floor(Number(r.qty)) || 1)
		const unit = parseMoney(r.unitZar)
		if (unit == null) return acc
		return acc + Math.round(qtyN * unit * 100) / 100
	}, 0)

	return (
		<div className="mt-4 space-y-4">
			<p className="text-xs text-ops-muted">
				Enter one or more line items (description and unit price in ZAR). The account client receives
				the trip confirmation and quote email from the configured comms template.
			</p>
			<div className="overflow-x-auto rounded-md border border-ops-border">
				<table className="w-full min-w-[28rem] text-left text-sm">
					<thead className="border-b border-ops-border bg-ops-canvas/40 text-ops-table-head">
						<tr>
							<th scope="col" className="px-3 py-2 font-medium">
								Description
							</th>
							<th scope="col" className="w-20 px-2 py-2 font-medium">
								Qty
							</th>
							<th scope="col" className="w-32 px-2 py-2 font-medium">
								Unit (ZAR)
							</th>
							<th scope="col" className="w-10 px-1 py-2" />
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={r.key} className="border-b border-ops-border/80 last:border-0">
								<td className="px-2 py-2">
									<Input
										className="h-9 border-ops-border bg-ops-canvas text-ops-foreground"
										value={r.label}
										onChange={(e) => updateRow(r.key, { label: e.target.value })}
										disabled={pending}
										placeholder="e.g. Airport transfer"
										aria-label="Line description"
									/>
								</td>
								<td className="px-2 py-2">
									<Input
										className="h-9 border-ops-border bg-ops-canvas text-ops-foreground"
										inputMode="numeric"
										value={r.qty}
										onChange={(e) => updateRow(r.key, { qty: e.target.value })}
										disabled={pending}
										aria-label="Quantity"
									/>
								</td>
								<td className="px-2 py-2">
									<Input
										className="h-9 border-ops-border bg-ops-canvas text-ops-foreground"
										inputMode="decimal"
										value={r.unitZar}
										onChange={(e) => updateRow(r.key, { unitZar: e.target.value })}
										disabled={pending}
										placeholder="0.00"
										aria-label="Unit price ZAR"
									/>
								</td>
								<td className="px-1 py-2 text-center">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 px-2 text-ops-muted hover:text-destructive"
										disabled={pending || rows.length <= 1}
										onClick={() => removeRow(r.key)}
										aria-label="Remove line"
									>
										×
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Button type="button" variant="outline" size="sm" disabled={pending} onClick={addRow}>
					Add line
				</Button>
				<p className="text-sm font-medium text-ops-foreground">
					Quote total:{' '}
					{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(
						computedTotal,
					)}
				</p>
			</div>
			<div className="flex flex-wrap gap-2">
				{bookingStatus === 'pending_confirmation' ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={pending}
						onClick={(e) => {
							e.stopPropagation()
							setErrorMessage(null)
							const lineItems = rowsToLineItems(rows)
							if (lineItems.length === 0) {
								setErrorMessage(
									'Add at least one line with a description and a positive unit price (ZAR).',
								)
								return
							}
							startTransition(async () => {
								const res = await saveAccountBookingQuoteDraft({ bookingId, lineItems })
								if (res.ok) {
									router.refresh()
									return
								}
								setErrorMessage(res.error.message)
							})
						}}
					>
						{pending ? 'Saving…' : 'Save quote draft'}
					</Button>
				) : null}
				<Button
					type="button"
					variant="default"
					size="sm"
					disabled={pending}
					onClick={(e) => {
						e.stopPropagation()
						setErrorMessage(null)
						const lineItems = rowsToLineItems(rows)
						if (lineItems.length === 0) {
							setErrorMessage(
								'Add at least one line with a description and a positive unit price (ZAR).',
							)
							return
						}
						startTransition(async () => {
							const res = await sendAccountBookingQuote({ bookingId, lineItems })
							if (res.ok) {
								router.refresh()
								return
							}
							setErrorMessage(res.error.message)
						})
					}}
				>
					{pending ? 'Sending…' : 'Send quote'}
				</Button>
			</div>
			{errorMessage ? (
				<p className="text-sm text-destructive" role="alert">
					{errorMessage}
				</p>
			) : null}
		</div>
	)
}
