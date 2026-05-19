'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { assignBookingToRun } from '@/actions/opsDispatch'
import { CreditLimitOverrideDialog } from '@/features/ops/components/CreditLimitOverrideDialog'
import {
	VehicleSuggestionsPanel,
	type VehicleSuggestionPick,
} from '@/features/ops/components/VehicleSuggestionsPanel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Select } from '@/components/ui/select'
import { getAccountDispatchBlockMessage } from '@/features/ops/reason-code-copy'
import { isOverridableAccountDispatchReason } from '@/lib/dispatch-override-token'
import type { NotDispatchableAccountDetail } from '@/lib/ops-action-result'
import type { OpsBookingAssignableDriverRow } from '@/lib/ops-booking-assign-load'
import { cn } from '@/lib/utils'

const selectOps =
	'min-h-11 w-full border-ops-border bg-ops-canvas text-ops-foreground focus-visible:ring-ops'

type FormValues = {
	driverProfileId: string
}

function suggestionRankForAudit(rank: number): 1 | 2 | 3 | undefined {
	if (rank === 1 || rank === 2 || rank === 3) {
		return rank
	}
	return undefined
}

export function OpsBookingAssignTripForm({
	bookingId,
	matchingDrivers,
	viewerIsAdmin,
	dispatchSuggestionsEnabled = false,
}: {
	bookingId: string
	matchingDrivers: OpsBookingAssignableDriverRow[]
	viewerIsAdmin: boolean
	dispatchSuggestionsEnabled?: boolean
}) {
	const router = useRouter()
	const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
	const [suggestionPick, setSuggestionPick] = useState<VehicleSuggestionPick | null>(null)
	const [feedback, setFeedback] = useState<
		| { variant: 'success'; text: string }
		| { variant: 'error'; text: string }
		| {
				variant: 'account_dispatch_block'
				reasonCode: string
				detail?: NotDispatchableAccountDetail
				correlationLine: string
		  }
		| null
	>(null)

	const form = useForm<FormValues>({
		defaultValues: {
			driverProfileId: matchingDrivers[0]?.id ?? '',
		},
	})

	const { isSubmitting } = form.formState
	const wDriverId = form.watch('driverProfileId')
	const selectedDriver = matchingDrivers.find((d) => d.id === wDriverId)

	const vehiclePickerOptions = useMemo(() => {
		const m = new Map<string, string>()
		for (const d of matchingDrivers) {
			const vid = d.default_vehicle_id?.trim() ?? ''
			if (vid.length > 0 && !m.has(vid)) {
				const label = d.vehicle_name?.trim() ? d.vehicle_name : vid.slice(0, 8)
				m.set(vid, label)
			}
		}
		return [...m.entries()].map(([id, name]) => ({ id, name }))
	}, [matchingDrivers])

	useEffect(() => {
		setSuggestionPick(null)
		form.reset({
			driverProfileId: matchingDrivers[0]?.id ?? '',
		})
	}, [matchingDrivers, form])

	async function onSubmit(values: FormValues) {
		setFeedback(null)
		const fromSuggestion =
			dispatchSuggestionsEnabled && suggestionPick
				? {
						vehicleId: suggestionPick.vehicleId,
						score: suggestionPick.score,
						rank: suggestionRankForAudit(suggestionPick.rank),
					}
				: undefined
		const res = await assignBookingToRun({
			bookingId,
			driverProfileId: values.driverProfileId,
			vehicleId: fromSuggestion?.vehicleId,
			fromSuggestion,
		})
		if (!res.ok) {
			const ref = res.error.correlationId
			const correlationLine = ref ? `Reference: ${ref.slice(0, 8)}…` : ''
			if (
				res.error.code === 'NOT_DISPATCHABLE_ACCOUNT' &&
				typeof res.error.reasonCode === 'string' &&
				res.error.reasonCode.length > 0
			) {
				setFeedback({
					variant: 'account_dispatch_block',
					reasonCode: res.error.reasonCode,
					detail: res.error.detail,
					correlationLine,
				})
				return
			}
			const suffix = correlationLine ? ` ${correlationLine}` : ''
			setFeedback({ variant: 'error', text: `${res.error.message}${suffix}` })
			return
		}
		setFeedback({
			variant: 'success',
			text: 'Trip created and booking linked.',
		})
		router.push(`/ops/bookings/${encodeURIComponent(bookingId)}`)
		router.refresh()
	}

	const showOverrideEntry =
		feedback?.variant === 'account_dispatch_block' &&
		viewerIsAdmin &&
		isOverridableAccountDispatchReason(feedback.reasonCode)

	const overrideVehicleId = selectedDriver?.default_vehicle_id ?? ''

	return (
		<Form {...form}>
			{showOverrideEntry && feedback?.variant === 'account_dispatch_block' ? (
				<CreditLimitOverrideDialog
					open={overrideDialogOpen}
					onOpenChange={setOverrideDialogOpen}
					bookingId={bookingId}
					reasonCode={
						feedback.reasonCode === 'credit_limit_exceeded'
							? 'credit_limit_exceeded'
							: 'overdue_invoices'
					}
					driverProfileId={form.watch('driverProfileId')}
					vehicleId={overrideVehicleId}
					onCompleted={() => {
						setFeedback({
							variant: 'success',
							text: 'Trip created and booking linked.',
						})
						router.push(`/ops/bookings/${encodeURIComponent(bookingId)}`)
						router.refresh()
					}}
				/>
			) : null}
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="min-w-0 max-w-full space-y-4 rounded-lg border border-ops-border bg-ops-surface/40 p-4"
			>
				{dispatchSuggestionsEnabled && bookingId.trim() !== '' ? (
					<VehicleSuggestionsPanel
						bookingId={bookingId}
						vehicleOptions={vehiclePickerOptions}
						onPickSuggestion={(pick) => {
							const driver = matchingDrivers.find((d) => d.default_vehicle_id === pick.vehicleId)
							if (!driver) {
								return
							}
							form.setValue('driverProfileId', driver.id)
							setSuggestionPick(pick)
						}}
					/>
				) : null}

				{feedback?.variant === 'account_dispatch_block' ? (
					<Alert
						data-testid="ops-account-dispatch-block"
						data-reason-code={feedback.reasonCode}
						variant="destructive"
						className="border-red-900/60 bg-red-950/50 text-red-100 [&>div]:text-red-200/95"
					>
						<AlertDescription className="space-y-2">
							<span className="block text-sm font-semibold text-red-100">Dispatch blocked</span>
							<span className="block text-sm leading-relaxed">
								{getAccountDispatchBlockMessage(feedback.reasonCode, feedback.detail)}
							</span>
							{feedback.correlationLine ? (
								<span className="block text-xs text-red-300/90">{feedback.correlationLine}</span>
							) : null}
							{showOverrideEntry ? (
								<div className="pt-1">
									<Button
										type="button"
										variant="outline"
										className="border-amber-700/80 bg-amber-950/40 text-amber-100 hover:bg-amber-900/50"
										onClick={() => setOverrideDialogOpen(true)}
									>
										Admin override…
									</Button>
								</div>
							) : null}
						</AlertDescription>
					</Alert>
				) : feedback ? (
					<Alert
						variant={feedback.variant === 'error' ? 'destructive' : 'default'}
						className={
							feedback.variant === 'error'
								? 'border-red-900/60 bg-red-950/50 text-red-100 [&>div]:text-red-200/95'
								: 'border-emerald-900/50 bg-emerald-950/30 text-emerald-100 [&>div]:text-emerald-200/90'
						}
					>
						<AlertDescription>{feedback.text}</AlertDescription>
					</Alert>
				) : null}

				<FormField
					control={form.control}
					name="driverProfileId"
					rules={{ required: 'Choose a driver' }}
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-ops-muted">Driver (default fleet vehicle)</FormLabel>
							<FormControl>
								<Select
									{...field}
									className={cn(selectOps)}
									onChange={(e) => {
										field.onChange(e)
										setSuggestionPick(null)
									}}
								>
									{matchingDrivers.map((c) => (
										<option key={c.id} value={c.id}>
											{c.full_name} — {c.vehicle_name} ({c.vehicle_classification_label})
										</option>
									))}
								</Select>
							</FormControl>
							<p className="text-xs text-ops-muted">
								Trips use each driver’s default vehicle from{' '}
								<Link href="/ops/fleet/drivers" className="underline underline-offset-2">
									Fleet → Drivers
								</Link>
								. To change the vehicle for this booking, assign the right vehicle to the driver first —
								vehicles are not picked per trip here.
							</p>
							<FormMessage className="text-red-400" />
						</FormItem>
					)}
				/>

				<div className="flex flex-wrap gap-2">
					<Button type="submit" disabled={isSubmitting || matchingDrivers.length === 0}>
						{isSubmitting ? 'Assigning…' : 'Create trip and link booking'}
					</Button>
					<Button type="button" variant="outline" asChild>
						<Link href={`/ops/bookings/${encodeURIComponent(bookingId)}`}>Cancel</Link>
					</Button>
				</div>
			</form>
		</Form>
	)
}
