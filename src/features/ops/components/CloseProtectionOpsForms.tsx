'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
	createCloseProtectionEngagementAction,
	updateCloseProtectionEngagementAction,
} from '@/actions/opsCloseProtection'
import { Button } from '@/components/ui/button'
import type { CloseProtectionEngagementStatusDb } from '@/types/database.types'

const STATUSES: CloseProtectionEngagementStatusDb[] = [
	'draft',
	'active',
	'completed',
	'cancelled',
]

export function CloseProtectionCreateForm({ bookingId }: { bookingId: string }) {
	const router = useRouter()
	const [msg, setMsg] = useState('')
	const [busy, setBusy] = useState(false)

	async function onCreate(e: React.FormEvent) {
		e.preventDefault()
		setMsg('')
		setBusy(true)
		const res = await createCloseProtectionEngagementAction({ bookingId })
		setBusy(false)
		if (!res.ok) {
			setMsg(res.message)
			return
		}
		router.push(`/ops/close-protection/${res.engagementId}`)
	}

	return (
		<form
			onSubmit={onCreate}
			className="rounded-lg border border-ops-border bg-ops-surface p-4 shadow-sm"
		>
			<p className="text-sm text-ops-muted">
				Booking <span className="font-mono text-ops-foreground">{bookingId}</span>
			</p>
			<Button type="submit" disabled={busy} className="mt-3 min-h-11">
				{busy ? 'Creating…' : 'Create engagement'}
			</Button>
			{msg ? (
				<p className="mt-2 text-sm text-destructive" role="status">
					{msg}
				</p>
			) : null}
		</form>
	)
}

export function CloseProtectionEngagementEditForm({
	engagementId,
	bookingId,
	initialTripId,
	initialStatus,
	initialNotes,
}: {
	engagementId: string
	bookingId: string
	initialTripId: string | null
	initialStatus: string
	initialNotes: string | null
}) {
	const router = useRouter()
	const [status, setStatus] = useState(initialStatus)
	const [notes, setNotes] = useState(initialNotes ?? '')
	const [tripId, setTripId] = useState(initialTripId ?? '')
	const [msg, setMsg] = useState('')
	const [busy, setBusy] = useState(false)

	async function onSave(e: React.FormEvent) {
		e.preventDefault()
		setMsg('')
		setBusy(true)
		const tripPayload =
			tripId.trim() === ''
				? { tripId: null as null }
				: { tripId: tripId.trim() }
		const res = await updateCloseProtectionEngagementAction({
			engagementId,
			status: status as CloseProtectionEngagementStatusDb,
			coordinationNotes: notes,
			...tripPayload,
		})
		setBusy(false)
		setMsg(res.ok ? 'Saved.' : res.message)
		if (res.ok) router.refresh()
	}

	return (
		<form
			onSubmit={onSave}
			className="space-y-4 rounded-lg border border-ops-border bg-ops-surface p-4 shadow-sm"
		>
			<div className="text-sm text-ops-muted">
				Booking{' '}
				<Link
					href={`/ops/close-protection?bookingId=${encodeURIComponent(bookingId)}`}
					className="font-mono text-primary underline-offset-2 hover:underline"
				>
					{bookingId}
				</Link>
			</div>
			<label className="block text-sm">
				<span className="text-ops-muted">Status</span>
				<select
					value={status}
					onChange={(ev) => setStatus(ev.target.value)}
					className="mt-1 min-h-11 w-full rounded-md border border-ops-border bg-ops-surface px-3 py-2.5 text-sm text-ops-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops"
				>
					{STATUSES.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>
			</label>
			<label className="block text-sm">
				<span className="text-ops-muted">Trip id (optional, must be linked via booking_trips)</span>
				<input
					value={tripId}
					onChange={(ev) => setTripId(ev.target.value)}
					placeholder="uuid or empty to clear"
					className="mt-1 min-h-11 w-full rounded-md border border-ops-border bg-ops-surface px-3 py-2.5 font-mono text-sm text-ops-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops"
				/>
			</label>
			<label className="block text-sm">
				<span className="text-ops-muted">Coordination notes (staff only)</span>
				<textarea
					value={notes}
					onChange={(ev) => setNotes(ev.target.value)}
					rows={8}
					className="mt-1 w-full rounded-md border border-ops-border bg-ops-surface px-3 py-2.5 text-sm text-ops-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops"
				/>
			</label>
			<Button type="submit" disabled={busy} className="min-h-11">
				{busy ? 'Saving…' : 'Save'}
			</Button>
			{msg ? (
				<p className="text-sm text-ops-muted" role="status">
					{msg}
				</p>
			) : null}
		</form>
	)
}
