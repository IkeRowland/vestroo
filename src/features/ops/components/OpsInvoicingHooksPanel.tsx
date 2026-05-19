'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { updateBookingInvoicingHooksAction } from '@/actions/opsInvoicingHooks'
import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
import { Button } from '@/components/ui/button'

export function OpsInvoicingHooksPanel() {
	const router = useRouter()
	const [bookingId, setBookingId] = useState('')
	const [invoiceRequested, setInvoiceRequested] = useState(false)
	const [purchaseOrderRef, setPurchaseOrderRef] = useState('')
	const [billingEntityRef, setBillingEntityRef] = useState('')
	const [message, setMessage] = useState<string | null>(null)
	const [actionError, setActionError] = useState<{ message: string; correlationId?: string } | null>(null)
	const [pending, setPending] = useState(false)

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setMessage(null)
		setActionError(null)
		setPending(true)
		try {
			const res = await updateBookingInvoicingHooksAction({
				bookingId: bookingId.trim(),
				invoiceRequested,
				purchaseOrderRef: purchaseOrderRef.trim() || null,
				billingEntityRef: billingEntityRef.trim() || null,
			})
			if (!res.ok) {
				setActionError({
					message: res.error.message,
					correlationId: res.error.correlationId,
				})
				return
			}
			setMessage('Saved.')
		} finally {
			setPending(false)
		}
	}

	return (
		<div className="max-w-xl rounded-lg border border-ops-border bg-ops-surface p-4 shadow-sm">
			<h1 className="text-lg font-semibold text-ops-foreground">Corporate invoicing hooks</h1>
			<p className="mt-1 text-sm text-ops-muted">
				MVP staff tool: set invoice request flag and short references on a booking (no PDF).
			</p>
			{actionError ? (
				<div className="mt-4">
					<OpsErrorState
						title="Could not save invoicing hooks"
						message={actionError.message}
						sanitizeMessage={false}
						correlationId={actionError.correlationId}
						onRetry={() => router.refresh()}
						secondaryAction={{ label: 'Back to trips', href: '/ops/trips' }}
					/>
				</div>
			) : null}
			<form onSubmit={onSubmit} className="mt-4 space-y-3">
				<label className="block text-sm text-ops-foreground">
					Booking ID (UUID)
					<input
						className="mt-1 w-full rounded-md border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops"
						value={bookingId}
						onChange={(ev) => setBookingId(ev.target.value)}
						placeholder="00000000-0000-4000-8000-000000000000"
						required
					/>
				</label>
				<label className="flex items-center gap-2 text-sm text-ops-foreground">
					<input
						type="checkbox"
						checked={invoiceRequested}
						onChange={(ev) => setInvoiceRequested(ev.target.checked)}
					/>
					Invoice requested
				</label>
				<label className="block text-sm text-ops-foreground">
					Purchase order ref (optional)
					<input
						className="mt-1 w-full rounded-md border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops"
						value={purchaseOrderRef}
						onChange={(ev) => setPurchaseOrderRef(ev.target.value)}
						maxLength={120}
					/>
				</label>
				<label className="block text-sm text-ops-foreground">
					Billing entity ref (optional)
					<input
						className="mt-1 w-full rounded-md border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops"
						value={billingEntityRef}
						onChange={(ev) => setBillingEntityRef(ev.target.value)}
						maxLength={120}
					/>
				</label>
				<Button type="submit" disabled={pending} className="mt-2">
					{pending ? 'Saving…' : 'Save'}
				</Button>
				{message ? (
					<p className="text-sm text-ops-muted" role="status">
						{message}
					</p>
				) : null}
			</form>
		</div>
	)
}
