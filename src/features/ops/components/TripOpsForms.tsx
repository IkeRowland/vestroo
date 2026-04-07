'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
	recordTripDelayAction,
	swapTripVehicleAction,
	updateTripStatusAction,
} from '@/actions/opsDispatch'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { TripFulfilmentStatusDb } from '@/types/database.types'
import { cn } from '@/lib/utils'

const STATUSES: TripFulfilmentStatusDb[] = [
	'booking',
	'assigned',
	'en_route',
	'completed',
	'cancelled',
]

const fieldClass =
	'min-h-11 border-ops-border bg-ops-canvas text-ops-foreground focus-visible:ring-ops'

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
	const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
	const [busy, setBusy] = useState(false)
	const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)

	async function applyStatus(next: TripFulfilmentStatusDb) {
		setMsg(null)
		setBusy(true)
		const res = await updateTripStatusAction({ tripId, status: next })
		setBusy(false)
		setMsg(
			res.ok
				? { tone: 'ok', text: 'Status updated.' }
				: { tone: 'err', text: res.message },
		)
		if (res.ok) router.refresh()
	}

	function onStatusClick(next: TripFulfilmentStatusDb) {
		if (next === 'cancelled' && currentStatus !== 'cancelled') {
			setConfirmCancelOpen(true)
			return
		}
		void applyStatus(next)
	}

	async function onConfirmCancel() {
		setConfirmCancelOpen(false)
		await applyStatus('cancelled')
	}

	async function onDelay(e: React.FormEvent) {
		e.preventDefault()
		setMsg(null)
		if (!revisedEnd.trim()) {
			setMsg({ tone: 'err', text: 'Choose a revised end time.' })
			return
		}
		const parsed = new Date(revisedEnd).getTime()
		if (Number.isNaN(parsed)) {
			setMsg({ tone: 'err', text: 'That date and time is not valid.' })
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
		setMsg(
			res.ok
				? { tone: 'ok', text: 'Delay recorded.' }
				: { tone: 'err', text: res.message },
		)
		if (res.ok) {
			setNote('')
			setRevisedEnd('')
			router.refresh()
		}
	}

	async function onSwap(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setMsg(null)
		const fd = new FormData(e.currentTarget)
		const newVehicleId = String(fd.get('newVehicleId') ?? '')
		setBusy(true)
		const res = await swapTripVehicleAction({ tripId, newVehicleId })
		setBusy(false)
		setMsg(
			res.ok
				? { tone: 'ok', text: 'Vehicle updated.' }
				: { tone: 'err', text: res.message },
		)
		if (res.ok) router.refresh()
	}

	return (
		<div className="mt-3 space-y-3 border-t border-ops-border pt-3 text-sm">
			<AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Mark this trip as cancelled?</AlertDialogTitle>
						<AlertDialogDescription>
							This updates trip status for dispatch and reporting. Re-opening a cancelled trip may
							require a new assignment flow — confirm only when the booking is not proceeding.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button">Keep current status</AlertDialogCancel>
						<Button
							type="button"
							disabled={busy}
							className="min-h-11 bg-red-700 text-white hover:bg-red-600"
							onClick={() => void onConfirmCancel()}
						>
							Confirm cancellation
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{msg ? (
				<Alert
					variant={msg.tone === 'err' ? 'destructive' : 'default'}
					className={
						msg.tone === 'err'
							? 'border-red-900/60 bg-red-950/50 text-red-100'
							: 'border-emerald-900/50 bg-emerald-950/30 text-emerald-100'
					}
					role="status"
				>
					<AlertDescription>{msg.text}</AlertDescription>
				</Alert>
			) : null}

			<div className="flex flex-wrap gap-2">
				<span className="w-full text-ops-muted">Trip status</span>
				{STATUSES.map((s) => (
					<button
						key={s}
						type="button"
						disabled={busy || s === currentStatus}
						onClick={() => onStatusClick(s)}
						className="min-h-10 rounded border border-ops-border px-2.5 py-1.5 text-xs font-medium capitalize text-ops-foreground hover:bg-ops-surface-hover disabled:opacity-40"
					>
						{s.replace(/_/g, ' ')}
					</button>
				))}
			</div>
			<form onSubmit={onDelay} className="grid gap-3 sm:grid-cols-2">
				<div className="sm:col-span-2">
					<Label htmlFor={`delay-note-${tripId}`} className="text-ops-muted">
						Delay note
					</Label>
					<Input
						id={`delay-note-${tripId}`}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						className={cn('mt-1', fieldClass)}
						placeholder="Traffic, airport hold, …"
						required
					/>
				</div>
				<div className="sm:col-span-2">
					<Label htmlFor={`delay-end-${tripId}`} className="text-ops-muted">
						Revised end (local)
					</Label>
					<Input
						id={`delay-end-${tripId}`}
						value={revisedEnd}
						onChange={(e) => setRevisedEnd(e.target.value)}
						type="datetime-local"
						className={cn('mt-1', fieldClass)}
						required
					/>
				</div>
				<Button
					type="submit"
					disabled={busy}
					className="min-h-11 bg-ops-surface-hover text-ops-foreground hover:bg-ops-surface-active sm:col-span-2"
				>
					Save delay
				</Button>
			</form>
			{vehicles.filter((v) => v.id !== currentVehicleId).length === 0 ? (
				<p className="text-xs text-ops-muted">
					Add another fleet vehicle to enable swaps from this trip.
				</p>
			) : (
				<form onSubmit={onSwap} className="flex flex-wrap items-end gap-2">
					<div className="min-w-[12rem] flex-1">
						<Label htmlFor={`swap-veh-${tripId}`} className="text-ops-muted">
							Swap vehicle
						</Label>
						<Select
							id={`swap-veh-${tripId}`}
							name="newVehicleId"
							required
							className={cn('mt-1', fieldClass)}
							defaultValue=""
						>
							<option value="" disabled>
								Select replacement…
							</option>
							{vehicles
								.filter((v) => v.id !== currentVehicleId)
								.map((v) => (
									<option key={v.id} value={v.id}>
										{v.name}
									</option>
								))}
						</Select>
					</div>
					<Button
						type="submit"
						disabled={busy}
						className="min-h-11 bg-amber-800 text-white hover:bg-amber-700"
					>
						Apply swap
					</Button>
				</form>
			)}
		</div>
	)
}
