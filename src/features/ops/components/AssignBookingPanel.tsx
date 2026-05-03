'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { assignBookingToRun } from '@/actions/opsDispatch'
import { CreditLimitOverrideDialog } from '@/features/ops/components/CreditLimitOverrideDialog'
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
import { formatBookingIntentLabel } from '@/features/ops/booking-intent-labels'
import { FulfilQueueRowActions } from '@/features/ops/components/FulfilQueueRowActions'
import {
	VehicleSuggestionsPanel,
	type VehicleSuggestionPick,
} from '@/features/ops/components/VehicleSuggestionsPanel'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import { getAccountDispatchBlockMessage } from '@/features/ops/reason-code-copy'
import { getFulfilEmptyCopy } from '@/lib/fulfil-queue-buckets'
import type { FulfilQueueBucket } from '@/lib/fulfil-queue-buckets'
import type { NotDispatchableAccountDetail } from '@/lib/ops-action-result'
import { isOverridableAccountDispatchReason } from '@/lib/dispatch-override-token'
import { cn } from '@/lib/utils'

export type AssignBookingQueueRow = {
	id: string
	payment_reference: string | null
	pickup_datetime: string | null
	booking_intent?: string | null
}

export type FulfilPanelBookingRow = AssignBookingQueueRow & {
	status?: string | null
	payment_status?: string | null
	trip_request_accepted_at?: string | null
}

export type AssignRunOption = {
	id: string
	label: string
}

export type AssignProfileOption = {
	id: string
	full_name: string
}

export type AssignVehicleOption = {
	id: string
	name: string
}

type AssignFormValues = {
	bookingId: string
	serviceRunId: string
	driverProfileId: string
	vehicleId: string
}

const selectOps =
	'min-h-11 border-ops-border bg-ops-canvas text-ops-foreground focus-visible:ring-ops'

export function AssignBookingPanel({
	queue = 'paid',
	bookings,
	serviceRuns,
	driverProfiles,
	vehicles,
	viewerIsAdmin = false,
	initialBookingId = null,
	dispatchSuggestionsEnabled = false,
}: {
	queue?: FulfilQueueBucket
	bookings: FulfilPanelBookingRow[]
	serviceRuns: AssignRunOption[]
	driverProfiles: AssignProfileOption[]
	vehicles: AssignVehicleOption[]
	/** When true, show override affordance for overridable account guard reasons (admin only). */
	viewerIsAdmin?: boolean
	/** Pre-select a booking (e.g. from `/ops/trips?bookingId=` deep link — Story 14.8). */
	initialBookingId?: string | null
	/** Epic 15 / **15D.2** — server-derived; when false the suggestions panel is not mounted. */
	dispatchSuggestionsEnabled?: boolean
}) {
	const router = useRouter()
	const [lastSuggestionPick, setLastSuggestionPick] = useState<VehicleSuggestionPick | null>(null)
	const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
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

	const form = useForm<AssignFormValues>({
		defaultValues: {
			bookingId: bookings[0]?.id ?? '',
			serviceRunId: serviceRuns[0]?.id ?? '',
			driverProfileId: driverProfiles[0]?.id ?? '',
			vehicleId: vehicles[0]?.id ?? '',
		},
	})

	const { isSubmitting } = form.formState
	const [wBookingId, wServiceRunId, wDriverProfileId, wVehicleId] = form.watch([
		'bookingId',
		'serviceRunId',
		'driverProfileId',
		'vehicleId',
	])

	useEffect(() => {
		const fromUrl =
			initialBookingId && bookings.some((b) => b.id === initialBookingId)
				? initialBookingId
				: (bookings[0]?.id ?? '')
		form.reset({
			bookingId: fromUrl,
			serviceRunId: serviceRuns[0]?.id ?? '',
			driverProfileId: driverProfiles[0]?.id ?? '',
			vehicleId: vehicles[0]?.id ?? '',
		})
	}, [bookings, serviceRuns, driverProfiles, vehicles, form, initialBookingId])

	useEffect(() => {
		setLastSuggestionPick(null)
	}, [wBookingId])

	async function onSubmit(values: AssignFormValues) {
		setFeedback(null)
		const fromSuggestion =
			dispatchSuggestionsEnabled &&
			lastSuggestionPick &&
			lastSuggestionPick.vehicleId === values.vehicleId
				? {
						vehicleId: lastSuggestionPick.vehicleId,
						score: lastSuggestionPick.score,
						...(lastSuggestionPick.rank === 1 ||
						lastSuggestionPick.rank === 2 ||
						lastSuggestionPick.rank === 3
							? { rank: lastSuggestionPick.rank as 1 | 2 | 3 }
							: {}),
					}
				: undefined
		const res = await assignBookingToRun({
			bookingId: values.bookingId,
			serviceRunId: values.serviceRunId,
			driverProfileId: values.driverProfileId,
			vehicleId: values.vehicleId,
			...(fromSuggestion ? { fromSuggestion } : {}),
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
			text: 'Trip created and booking linked. The queue will refresh.',
		})
		router.refresh()
	}

	const emptyCopy = getFulfilEmptyCopy(queue)

	if (bookings.length === 0) {
		return <OpsEmptyState title={emptyCopy.title} description={emptyCopy.description} />
	}

	if (queue === 'pending' || queue === 'trip_request') {
		return (
			<div className="min-w-0 max-w-full space-y-3">
				<OpsTableShell caption={`${queue} fulfil queue`}>
					<thead className="border-b border-ops-border bg-ops-surface/60 text-ops-table-head text-xs uppercase tracking-wide text-ops-muted">
						<tr>
							<th scope="col" className="px-3 py-2 font-medium">
								Reference
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Pickup
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Status
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Payment
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Intent
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{bookings.map((b) => (
							<tr key={b.id} className="border-b border-ops-border/80">
								<td className="px-3 py-3 align-top text-sm">
									<span className="font-medium text-ops-foreground">
										{b.payment_reference ?? b.id.slice(0, 8)}
									</span>
								</td>
								<td className="px-3 py-3 align-top text-sm text-ops-muted">
									{b.pickup_datetime ? new Date(b.pickup_datetime).toLocaleString() : '—'}
								</td>
								<td className="px-3 py-3 align-top text-sm capitalize">{b.status ?? '—'}</td>
								<td className="px-3 py-3 align-top text-sm capitalize">
									{b.payment_status ?? '—'}
								</td>
								<td className="px-3 py-3 align-top text-sm text-ops-foreground">
									<span className="rounded bg-muted/60 px-2 py-0.5 text-xs">
										{formatBookingIntentLabel(b.booking_intent ?? null)}
									</span>
								</td>
								<td className="px-3 py-3 align-top">
									{queue === 'pending' ? (
										<FulfilQueueRowActions
											queue="pending"
											bookingId={b.id}
											isCancelled={b.status === 'cancelled'}
											tripRequestAcceptedAt={null}
										/>
									) : (
										<FulfilQueueRowActions
											queue="trip_request"
											bookingId={b.id}
											isCancelled={false}
											tripRequestAcceptedAt={b.trip_request_accepted_at ?? null}
										/>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</OpsTableShell>
				<div className="border-t border-ops-border pt-4">
					<p className="text-xs font-medium uppercase tracking-wide text-ops-muted">
						Close protection (booking)
					</p>
					<ul className="mt-2 flex flex-wrap gap-2">
						{bookings.map((b) => (
							<li key={b.id}>
								<Link
									href={`/ops/close-protection?bookingId=${encodeURIComponent(b.id)}`}
									className="text-sm text-emerald-400 underline-offset-2 hover:underline"
								>
									{b.payment_reference ?? b.id.slice(0, 8)} — engagement
								</Link>
							</li>
						))}
					</ul>
				</div>
			</div>
		)
	}

	if (serviceRuns.length === 0) {
		const hasBookings = bookings.length > 0
		return (
			<div className="min-w-0 max-w-full space-y-4">
				<OpsEmptyState
					title={hasBookings ? 'Add service runs before assigning' : 'No service runs yet'}
					description={
						hasBookings
							? `${bookings.length} booking(s) are ready to assign, but there are no operational runs on file. Open Ops settings to manage configuration, seed patterns where available, create runs for the dates you operate, then return here.`
							: 'Seed operational runs from Ops settings when you are ready. Runs are scheduling windows only — separate from quotes or ride pricing.'
					}
					action={
						<Button type="button" variant="secondary" size="sm" asChild>
							<Link href="/ops/settings">Ops settings</Link>
						</Button>
					}
				/>
				{hasBookings ? (
					<OpsTableShell caption="Paid queue (visible while you add runs)">
						<thead className="border-b border-ops-border bg-ops-surface/60 text-ops-table-head text-xs uppercase tracking-wide text-ops-muted">
							<tr>
								<th scope="col" className="px-3 py-2 font-medium">
									Reference
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Pickup
								</th>
							</tr>
						</thead>
						<tbody>
							{bookings.map((b) => (
								<tr key={b.id} className="border-b border-ops-border/80">
									<td className="px-3 py-2 text-sm font-medium text-ops-foreground">
										{b.payment_reference ?? b.id.slice(0, 8)}
									</td>
									<td className="px-3 py-2 text-sm text-ops-muted">
										{b.pickup_datetime ? new Date(b.pickup_datetime).toLocaleString() : '—'}
									</td>
								</tr>
							))}
						</tbody>
					</OpsTableShell>
				) : null}
			</div>
		)
	}

	if (driverProfiles.length === 0 || vehicles.length === 0) {
		return (
			<OpsEmptyState
				title="Fleet or driver data missing"
				description="Active driver profiles and vehicles are required to assign a trip. Complete roster and fleet setup in Supabase, then refresh this page."
			/>
		)
	}

	const showOverrideEntry =
		feedback?.variant === 'account_dispatch_block' &&
		viewerIsAdmin &&
		isOverridableAccountDispatchReason(feedback.reasonCode)

	return (
		<Form {...form}>
			{showOverrideEntry && feedback?.variant === 'account_dispatch_block' ? (
				<CreditLimitOverrideDialog
					open={overrideDialogOpen}
					onOpenChange={setOverrideDialogOpen}
					bookingId={wBookingId}
					reasonCode={
						feedback.reasonCode === 'credit_limit_exceeded'
							? 'credit_limit_exceeded'
							: 'overdue_invoices'
					}
					serviceRunId={wServiceRunId}
					driverProfileId={wDriverProfileId}
					vehicleId={wVehicleId}
					onCompleted={() => {
						setFeedback({
							variant: 'success',
							text: 'Trip created and booking linked. The queue will refresh.',
						})
						router.refresh()
					}}
				/>
			) : null}
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="min-w-0 max-w-full space-y-4 rounded-lg border border-ops-border bg-ops-surface/40 p-4"
			>
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

				<div className="grid gap-4 sm:grid-cols-2">
					<FormField
						control={form.control}
						name="bookingId"
						rules={{ required: 'Choose a booking' }}
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-ops-muted">Booking</FormLabel>
								<FormControl>
									<Select {...field} className={cn(selectOps)}>
										{bookings.map((b) => (
											<option key={b.id} value={b.id}>
												{b.payment_reference ?? b.id.slice(0, 8)}
												{b.pickup_datetime
													? ` — ${new Date(b.pickup_datetime).toLocaleString()}`
													: ''}{' '}
												· {formatBookingIntentLabel(b.booking_intent ?? null)}
											</option>
										))}
									</Select>
								</FormControl>
								<FormMessage className="text-red-400" />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="serviceRunId"
						rules={{ required: 'Choose a service run' }}
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-ops-muted">Service run</FormLabel>
								<FormControl>
									<Select {...field} className={cn(selectOps)}>
										{serviceRuns.map((r) => (
											<option key={r.id} value={r.id}>
												{r.label}
											</option>
										))}
									</Select>
								</FormControl>
								<FormMessage className="text-red-400" />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="driverProfileId"
						rules={{ required: 'Choose a driver' }}
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-ops-muted">Driver</FormLabel>
								<FormControl>
									<Select {...field} className={cn(selectOps)}>
										{driverProfiles.map((c) => (
											<option key={c.id} value={c.id}>
												{c.full_name || c.id.slice(0, 8)}
											</option>
										))}
									</Select>
								</FormControl>
								<FormMessage className="text-red-400" />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="vehicleId"
						rules={{ required: 'Choose a vehicle' }}
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-ops-muted">Vehicle</FormLabel>
								<FormControl>
									<Select
										{...field}
										className={cn(selectOps)}
										onChange={(e) => {
											field.onChange(e)
											const nextId = e.target.value
											if (lastSuggestionPick && nextId !== lastSuggestionPick.vehicleId) {
												setLastSuggestionPick(null)
											}
										}}
									>
										{vehicles.map((v) => (
											<option key={v.id} value={v.id}>
												{v.name}
											</option>
										))}
									</Select>
								</FormControl>
								<FormMessage className="text-red-400" />
							</FormItem>
						)}
					/>
				</div>
				{dispatchSuggestionsEnabled ? (
					<VehicleSuggestionsPanel
						bookingId={wBookingId}
						vehicleOptions={vehicles}
						onPickSuggestion={(pick) => {
							setLastSuggestionPick(pick)
							form.setValue('vehicleId', pick.vehicleId, {
								shouldValidate: true,
								shouldDirty: true,
							})
						}}
					/>
				) : null}
				<Button
					type="submit"
					disabled={isSubmitting}
					className="min-h-11 bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-60"
				>
					{isSubmitting ? 'Assigning…' : 'Create trip and link booking'}
				</Button>

				<div className="border-t border-ops-border pt-4">
					<p className="text-xs font-medium uppercase tracking-wide text-ops-muted">
						Close protection (booking)
					</p>
					<ul className="mt-2 flex flex-wrap gap-2">
						{bookings.map((b) => (
							<li key={b.id}>
								<Link
									href={`/ops/close-protection?bookingId=${encodeURIComponent(b.id)}`}
									className="text-sm text-emerald-400 underline-offset-2 hover:underline"
								>
									{b.payment_reference ?? b.id.slice(0, 8)} — engagement
								</Link>
							</li>
						))}
					</ul>
				</div>
			</form>
		</Form>
	)
}
