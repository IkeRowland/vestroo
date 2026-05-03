'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useState } from 'react'

import { markBookingPaymentReceivedAction } from '@/actions/markBookingPaymentReceived'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	isOpsActionFailure,
	opsActionCorrelationId,
	opsActionErrorMessage,
} from '@/lib/ops-action-result'

export type MarkPaymentReceivedDialogProps = {
	bookingId: string
	/** Default settlement amount (e.g. `bookings.total_amount`). */
	defaultAmountZar: number | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

function toDatetimeLocalValue(isoFallback: string): string {
	const d = new Date(isoFallback)
	if (Number.isNaN(d.getTime())) {
		return ''
	}
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Epic **16.14 / Q32** — ops marks **EFT received** via **`markBookingPaymentReceivedAction`**.
 */
export function MarkPaymentReceivedDialog({
	bookingId,
	defaultAmountZar,
	open,
	onOpenChange,
}: MarkPaymentReceivedDialogProps) {
	const router = useRouter()
	const titleId = useId()
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [evidenceRef, setEvidenceRef] = useState('')
	const [amountInput, setAmountInput] = useState('')
	const [receivedAtLocal, setReceivedAtLocal] = useState('')
	const [varianceReason, setVarianceReason] = useState('')

	const resetForm = useCallback(() => {
		setError(null)
		setEvidenceRef('')
		setVarianceReason('')
		const nowLocal = toDatetimeLocalValue(new Date().toISOString())
		setReceivedAtLocal(nowLocal)
		if (defaultAmountZar != null && Number.isFinite(defaultAmountZar)) {
			setAmountInput(String(defaultAmountZar))
		} else {
			setAmountInput('')
		}
	}, [defaultAmountZar])

	useEffect(() => {
		if (open) {
			resetForm()
		}
	}, [open, resetForm])

	useEffect(() => {
		if (!open) {
			return
		}
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onOpenChange(false)
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open, onOpenChange])

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		const amountZar = Number(amountInput.replace(',', '.').trim())
		if (!Number.isFinite(amountZar) || amountZar <= 0) {
			setError('Enter a valid positive amount (ZAR).')
			return
		}
		const ref = evidenceRef.trim()
		if (ref.length < 1) {
			setError('Evidence reference is required.')
			return
		}
		if (!receivedAtLocal) {
			setError('Received date/time is required.')
			return
		}
		const receivedMs = Date.parse(receivedAtLocal)
		if (Number.isNaN(receivedMs)) {
			setError('Received date/time is invalid.')
			return
		}
		const receivedAt = new Date(receivedMs).toISOString()

		setBusy(true)
		const res = await markBookingPaymentReceivedAction({
			bookingId,
			evidenceRef: ref,
			amountZar,
			receivedAt,
			varianceReason: varianceReason.trim() || undefined,
		})
		setBusy(false)
		if (!res.ok && isOpsActionFailure(res)) {
			const cid = opsActionCorrelationId(res)
			const suffix = cid ? ` Reference: ${cid.slice(0, 8)}…` : ''
			setError(`${opsActionErrorMessage(res)}${suffix}`)
			return
		}
		router.refresh()
		onOpenChange(false)
	}

	if (!open) {
		return null
	}

	return (
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				e.stopPropagation()
				if (e.target === e.currentTarget) {
					onOpenChange(false)
				}
			}}
			onClick={(e) => e.stopPropagation()}
		>
			<div
				role="dialog"
				data-testid="ops-mark-payment-received-dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				className="max-h-[min(90vh,40rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-ops-border bg-ops-surface p-5 shadow-xl"
				onMouseDown={(e) => e.stopPropagation()}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 id={titleId} className="text-lg font-semibold text-ops-foreground">
					Mark EFT received
				</h2>
				<p className="mt-1 text-sm text-ops-muted">
					Record bank transfer settlement for this booking (Q32 / Theme N).
				</p>

				<form className="mt-4 space-y-4" onSubmit={(e) => void onSubmit(e)}>
					{error ? (
						<Alert variant="destructive" className="border-red-900/60 bg-red-950/50 py-2 text-red-100">
							<AlertDescription className="text-xs">{error}</AlertDescription>
						</Alert>
					) : null}

					<div className="space-y-2">
						<Label htmlFor="ops-mpr-evidence">Evidence reference</Label>
						<Input
							id="ops-mpr-evidence"
							value={evidenceRef}
							onChange={(e) => setEvidenceRef(e.target.value)}
							disabled={busy}
							autoComplete="off"
							placeholder="Bank ref / statement line"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="ops-mpr-amount">Amount (ZAR)</Label>
						<Input
							id="ops-mpr-amount"
							inputMode="decimal"
							value={amountInput}
							onChange={(e) => setAmountInput(e.target.value)}
							disabled={busy}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="ops-mpr-received">Received at (local)</Label>
						<Input
							id="ops-mpr-received"
							type="datetime-local"
							value={receivedAtLocal}
							onChange={(e) => setReceivedAtLocal(e.target.value)}
							disabled={busy}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="ops-mpr-variance">Variance reason (optional, required if amount differs)</Label>
						<Textarea
							id="ops-mpr-variance"
							value={varianceReason}
							onChange={(e) => setVarianceReason(e.target.value)}
							disabled={busy}
							rows={3}
							placeholder="At least 10 characters when amount does not match expected"
						/>
					</div>

					<div className="flex flex-wrap justify-end gap-2 pt-2">
						<Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={busy}>
							{busy ? 'Saving…' : 'Mark received'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	)
}
