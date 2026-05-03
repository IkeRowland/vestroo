'use client'

import { useEffect, useState } from 'react'

import { assignBookingToRun, signDispatchOverrideToken } from '@/actions/opsDispatch'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type OverridableReason = 'credit_limit_exceeded' | 'overdue_invoices'

export function CreditLimitOverrideDialog({
	open,
	onOpenChange,
	bookingId,
	reasonCode,
	serviceRunId,
	driverProfileId,
	vehicleId,
	onCompleted,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	bookingId: string
	reasonCode: OverridableReason
	serviceRunId: string
	driverProfileId: string
	vehicleId: string
	onCompleted: () => void
}) {
	const [reason, setReason] = useState('')
	const [errorText, setErrorText] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		if (open) {
			setReason('')
			setErrorText(null)
			setBusy(false)
		}
	}, [open])

	const trimmedLen = reason.trim().length
	const canSubmit = trimmedLen >= 10 && trimmedLen <= 2000

	async function submitOverride() {
		if (!canSubmit) {
			return
		}
		setBusy(true)
		setErrorText(null)
		try {
			const signed = await signDispatchOverrideToken({
				bookingId,
				reasonCode,
				overrideReason: reason.trim(),
			})
			if (!signed.ok) {
				setErrorText(signed.error.message)
				setBusy(false)
				return
			}
			const assign = await assignBookingToRun({
				bookingId,
				serviceRunId,
				driverProfileId,
				vehicleId,
				overrideToken: signed.token,
			})
			if (!assign.ok) {
				setErrorText(assign.error.message)
				setBusy(false)
				return
			}
			setReason('')
			setErrorText(null)
			setBusy(false)
			onOpenChange(false)
			onCompleted()
		} catch (e) {
			setErrorText(e instanceof Error ? e.message : 'Something went wrong')
			setBusy(false)
		}
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(v) => {
				if (!busy) {
					onOpenChange(v)
				}
			}}
		>
			<AlertDialogContent className="border-ops-border bg-ops-surface text-ops-foreground">
				<AlertDialogHeader>
					<AlertDialogTitle className="text-ops-foreground">Admin: override dispatch guard</AlertDialogTitle>
					<AlertDialogDescription className="text-ops-muted">
						You are authorizing assignment despite an account guardrail (
						<code className="text-ops-foreground/90">{reasonCode}</code>). This action is audited. Provide a
						clear reason for dispute review (minimum 10 characters).
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-2">
					<Label htmlFor="dispatch-override-reason" className="text-ops-muted">
						Override reason
					</Label>
					<Textarea
						data-testid="ops-dispatch-override-reason"
						id="dispatch-override-reason"
						rows={5}
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						disabled={busy}
						placeholder="Why is dispatch justified in this case?"
						className="min-h-[120px] border-ops-border bg-ops-canvas text-ops-foreground"
						maxLength={2000}
					/>
					<p className="text-xs text-ops-muted">
						{trimmedLen} / 2000 · {trimmedLen < 10 ? `${10 - trimmedLen} more characters required` : 'Ready to submit'}
					</p>
					{errorText ? (
						<p className="text-sm text-red-400" role="alert">
							{errorText}
						</p>
					) : null}
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={busy} className="border-ops-border text-ops-foreground">
						Cancel
					</AlertDialogCancel>
					<Button
						type="button"
						disabled={!canSubmit || busy}
						className="bg-amber-700 text-white hover:bg-amber-600"
						onClick={() => void submitOverride()}
					>
						{busy ? 'Working…' : 'Authorize & assign'}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
