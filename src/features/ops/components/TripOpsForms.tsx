'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
	recordTripDelayAction,
	swapTripVehicleAction,
	updateTripStatusAction,
} from '@/actions/opsDispatch'
import type { TripFulfilmentStatusDb } from '@/types/database.types'

const STATUSES: TripFulfilmentStatusDb[] = [
	'booking',
	'assigned',
	'en_route',
	'completed',
	'cancelled',
]

export function TripOpsForms({
	tripId,
	currentStatus,
	vehicles,
	currentVehicleId,
}: {
	tripId: string
	currentStatus: string
	vehicles: { id: string; name: string }[]
	currentVehicleId: string
}) {
	const router = useRouter()
	const [note, setNote] = useState('')
	const [revisedEnd, setRevisedEnd] = useState('')
	const [msg, setMsg] = useState('')
	const [busy, setBusy] = useState(false)

	async function onStatus(next: TripFulfilmentStatusDb) {
		setMsg('')
		setBusy(true)
		const res = await updateTripStatusAction({ tripId, status: next })
		setBusy(false)
		setMsg(res.ok ? 'Status updated.' : res.message)
		if (res.ok) router.refresh()
	}

	async function onDelay(e: React.FormEvent) {
		e.preventDefault()
		setMsg('')
		if (!revisedEnd.trim()) {
			setMsg('Pick a revised end time')
			return
		}
		const parsed = new Date(revisedEnd).getTime()
		if (Number.isNaN(parsed)) {
			setMsg('Invalid date')
			return
		}
		setBusy(true)
		const iso = new Date(revisedEnd).toISOString()
		const res = await recordTripDelayAction({
			tripId,
			note,
			revisedEndEstimateIso: iso,
		})
		setBusy(false)
		setMsg(res.ok ? 'Delay recorded.' : res.message)
		if (res.ok) {
			setNote('')
			setRevisedEnd('')
			router.refresh()
		}
	}

	async function onSwap(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setMsg('')
		const fd = new FormData(e.currentTarget)
		const newVehicleId = String(fd.get('newVehicleId') ?? '')
		setBusy(true)
		const res = await swapTripVehicleAction({ tripId, newVehicleId })
		setBusy(false)
		setMsg(res.ok ? 'Vehicle updated.' : res.message)
		if (res.ok) router.refresh()
	}

	return (
		<div className="mt-3 space-y-3 border-t border-zinc-800 pt-3 text-sm">
			<div className="flex flex-wrap gap-2">
				<span className="w-full text-zinc-500">Status</span>
				{STATUSES.map((s) => (
					<button
						key={s}
						type="button"
						disabled={busy || s === currentStatus}
						onClick={() => onStatus(s)}
						className="min-h-10 rounded border border-zinc-700 px-2.5 py-1.5 text-xs font-medium capitalize text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
					>
						{s.replace(/_/g, ' ')}
					</button>
				))}
			</div>
			<form onSubmit={onDelay} className="grid gap-2 sm:grid-cols-2">
				<label className="block sm:col-span-2">
					<span className="text-zinc-500">Delay note</span>
					<input
						value={note}
						onChange={(e) => setNote(e.target.value)}
						className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white min-h-11"
						placeholder="Traffic, airport hold, …"
						required
					/>
				</label>
				<label className="block sm:col-span-2">
					<span className="text-zinc-500">Revised end (ISO local)</span>
					<input
						value={revisedEnd}
						onChange={(e) => setRevisedEnd(e.target.value)}
						type="datetime-local"
						className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white min-h-11"
						required
					/>
				</label>
				<button
					type="submit"
					disabled={busy}
					className="min-h-11 rounded bg-zinc-800 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 sm:col-span-2"
				>
					Save delay
				</button>
			</form>
			{vehicles.filter((v) => v.id !== currentVehicleId).length === 0 ? (
				<p className="text-xs text-zinc-500">
					Add another fleet vehicle to enable swaps from this trip.
				</p>
			) : (
				<form onSubmit={onSwap} className="flex flex-wrap items-end gap-2">
					<label className="min-w-[12rem] flex-1">
						<span className="text-zinc-500">Swap vehicle</span>
						<select
							name="newVehicleId"
							required
							className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white min-h-11"
						>
							<option value="">Select replacement…</option>
							{vehicles
								.filter((v) => v.id !== currentVehicleId)
								.map((v) => (
									<option key={v.id} value={v.id}>
										{v.name}
									</option>
								))}
						</select>
					</label>
					<button
						type="submit"
						disabled={busy}
						className="min-h-11 rounded bg-amber-800 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
					>
						Apply swap
					</button>
				</form>
			)}
			{msg ? (
				<p className="text-xs text-zinc-400" role="status">
					{msg}
				</p>
			) : null}
		</div>
	)
}
