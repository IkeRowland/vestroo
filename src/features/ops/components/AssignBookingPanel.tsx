'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { assignBookingToRun } from '@/actions/opsDispatch'
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
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import { OPS_EMPTY_COPY } from '@/features/ops/ops-list-state-copy'
import { cn } from '@/lib/utils'

export type AssignBookingQueueRow = {
	id: string
	payment_reference: string | null
	pickup_datetime: string | null
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
	chauffeurId: string
	vehicleId: string
}

const selectOps =
	'min-h-11 border-ops-border bg-ops-canvas text-ops-foreground focus-visible:ring-ops'

export function AssignBookingPanel({
	bookings,
	serviceRuns,
	chauffeurs,
	vehicles,
}: {
	bookings: AssignBookingQueueRow[]
	serviceRuns: AssignRunOption[]
	chauffeurs: AssignProfileOption[]
	vehicles: AssignVehicleOption[]
}) {
	const router = useRouter()
	const [feedback, setFeedback] = useState<{
		variant: 'success' | 'error'
		text: string
	} | null>(null)

	const form = useForm<AssignFormValues>({
		defaultValues: {
			bookingId: bookings[0]?.id ?? '',
			serviceRunId: serviceRuns[0]?.id ?? '',
			chauffeurId: chauffeurs[0]?.id ?? '',
			vehicleId: vehicles[0]?.id ?? '',
		},
	})

	const { isSubmitting } = form.formState

	useEffect(() => {
		form.reset({
			bookingId: bookings[0]?.id ?? '',
			serviceRunId: serviceRuns[0]?.id ?? '',
			chauffeurId: chauffeurs[0]?.id ?? '',
			vehicleId: vehicles[0]?.id ?? '',
		})
	}, [bookings, serviceRuns, chauffeurs, vehicles, form])

	async function onSubmit(values: AssignFormValues) {
		setFeedback(null)
		const res = await assignBookingToRun({
			bookingId: values.bookingId,
			serviceRunId: values.serviceRunId,
			chauffeurId: values.chauffeurId,
			vehicleId: values.vehicleId,
		})
		if (!res.ok) {
			setFeedback({ variant: 'error', text: res.message })
			return
		}
		setFeedback({
			variant: 'success',
			text: 'Trip created and booking linked. The queue will refresh.',
		})
		router.refresh()
	}

	if (bookings.length === 0) {
		return (
			<OpsEmptyState
				title={OPS_EMPTY_COPY.fulfilQueue.title}
				description={OPS_EMPTY_COPY.fulfilQueue.description}
			/>
		)
	}

	if (serviceRuns.length === 0) {
		return (
			<OpsEmptyState
				title="No service runs available"
				description="Add or seed service runs for the dates you operate before assigning bookings. Runs drive trip timing and chauffeur schedule windows."
			/>
		)
	}

	if (chauffeurs.length === 0 || vehicles.length === 0) {
		return (
			<OpsEmptyState
				title="Fleet or chauffeur data missing"
				description="Active chauffeur profiles and vehicles are required to assign a trip. Complete roster and fleet setup in Supabase, then refresh this page."
			/>
		)
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="min-w-0 max-w-full space-y-4 rounded-lg border border-ops-border bg-ops-surface/40 p-4"
			>
				{feedback ? (
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
													: ''}
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
						name="chauffeurId"
						rules={{ required: 'Choose a chauffeur' }}
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-ops-muted">Chauffeur</FormLabel>
								<FormControl>
									<Select {...field} className={cn(selectOps)}>
										{chauffeurs.map((c) => (
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
									<Select {...field} className={cn(selectOps)}>
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
					<ul className="mt-2 flex flex-wrap gap-2" role="list">
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
