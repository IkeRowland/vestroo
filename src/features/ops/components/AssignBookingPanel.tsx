'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { assignBookingToRun } from '@/actions/opsDispatch'

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
	const [message, setMessage] = useState('')
	const [pending, setPending] = useState(false)

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setMessage('')
		setPending(true)
		const fd = new FormData(e.currentTarget)
		const bookingId = String(fd.get('bookingId') ?? '')
		const serviceRunId = String(fd.get('serviceRunId') ?? '')
		const chauffeurId = String(fd.get('chauffeurId') ?? '')
		const vehicleId = String(fd.get('vehicleId') ?? '')
		const res = await assignBookingToRun({
			bookingId,
			serviceRunId,
			chauffeurId,
			vehicleId,
		})
		setPending(false)
		if (!res.ok) {
			setMessage(res.message)
			return
		}
		setMessage('Trip created and linked.')
		router.refresh()
	}

	if (bookings.length === 0) {
		return (
			<p className="text-sm text-zinc-400">
				No paid bookings waiting for a trip. New web bookings appear here after payment.
			</p>
		)
	}

	if (serviceRuns.length === 0) {
		return (
			<p className="text-sm text-amber-200">
				No service runs in the database yet. Seed or create runs before assigning.
			</p>
		)
	}

	if (chauffeurs.length === 0 || vehicles.length === 0) {
		return (
			<p className="text-sm text-amber-200">
				Add active chauffeur profiles and fleet vehicles in Supabase to enable assignment.
			</p>
		)
	}

	return (
		<form
			onSubmit={onSubmit}
			className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<label className="block text-sm">
					<span className="text-zinc-400">Booking</span>
					<select
						name="bookingId"
						required
						className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white min-h-11"
						defaultValue={bookings[0]?.id}
					>
						{bookings.map((b) => (
							<option key={b.id} value={b.id}>
								{b.payment_reference ?? b.id.slice(0, 8)}
								{b.pickup_datetime
									? ` — ${new Date(b.pickup_datetime).toLocaleString()}`
									: ''}
							</option>
						))}
					</select>
				</label>
				<label className="block text-sm">
					<span className="text-zinc-400">Service run</span>
					<select
						name="serviceRunId"
						required
						className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white min-h-11"
					>
						{serviceRuns.map((r) => (
							<option key={r.id} value={r.id}>
								{r.label}
							</option>
						))}
					</select>
				</label>
				<label className="block text-sm">
					<span className="text-zinc-400">Chauffeur</span>
					<select
						name="chauffeurId"
						required
						className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white min-h-11"
					>
						{chauffeurs.map((c) => (
							<option key={c.id} value={c.id}>
								{c.full_name || c.id.slice(0, 8)}
							</option>
						))}
					</select>
				</label>
				<label className="block text-sm">
					<span className="text-zinc-400">Vehicle</span>
					<select
						name="vehicleId"
						required
						className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white min-h-11"
					>
						{vehicles.map((v) => (
							<option key={v.id} value={v.id}>
								{v.name}
							</option>
						))}
					</select>
				</label>
			</div>
			<button
				type="submit"
				disabled={pending}
				className="min-h-11 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
			>
				{pending ? 'Assigning…' : 'Create trip & link booking'}
			</button>
			{message ? (
				<p className="text-sm text-zinc-300" role="status">
					{message}
				</p>
			) : null}
			<div className="border-t border-zinc-800 pt-4">
				<p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
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
	)
}
