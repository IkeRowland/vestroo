'use client'

import { useEffect, useState } from 'react'

import { fetchVehicleDispatchSuggestions } from '@/actions/opsDispatchSuggestions'
import type { Suggestion } from '@/lib/dispatch-suggestions'
import { cn } from '@/lib/utils'

/** Same shape as assign vehicle picker options (`AssignVehicleOption`). */
export type VehicleSuggestionPickerOption = {
	id: string
	name: string
}

type PanelState =
	| { phase: 'loading' }
	| { phase: 'ready'; suggestions: Suggestion[] }
	| { phase: 'error'; message: string }

export type VehicleSuggestionPick = {
	vehicleId: string
	score: number
	/** 1-based rank in the panel list (aligned with server suggestion rank for top rows). */
	rank: number
}

export function VehicleSuggestionsPanel({
	bookingId,
	vehicleOptions,
	onPickSuggestion,
}: {
	bookingId: string
	vehicleOptions: VehicleSuggestionPickerOption[]
	/** Fired when the dispatcher clicks a suggestion row (**15D.2** / **15D.3** audit handoff). */
	onPickSuggestion: (pick: VehicleSuggestionPick) => void
}) {
	const [state, setState] = useState<PanelState>(() =>
		bookingId.trim() === '' ? { phase: 'ready', suggestions: [] } : { phase: 'loading' },
	)

	useEffect(() => {
		if (bookingId.trim() === '') {
			setState({ phase: 'ready', suggestions: [] })
			return
		}
		let cancelled = false
		setState({ phase: 'loading' })
		void fetchVehicleDispatchSuggestions({ bookingId }).then((res) => {
			if (cancelled) return
			if (!res.ok) {
				setState({ phase: 'error', message: res.message })
				return
			}
			setState({ phase: 'ready', suggestions: res.suggestions })
		})
		return () => {
			cancelled = true
		}
	}, [bookingId])

	function displayNameForVehicle(vehicleId: string): string {
		const row = vehicleOptions.find((v) => v.id === vehicleId)
		if (row?.name && row.name.trim() !== '') {
			return row.name
		}
		return vehicleId.slice(0, 8)
	}

	const suggestions = state.phase === 'ready' ? state.suggestions : []
	const showList = state.phase === 'ready' && suggestions.length > 0
	const showEmpty = state.phase === 'ready' && suggestions.length === 0 && bookingId.trim() !== ''
	const showError = state.phase === 'error'
	const showLoading = state.phase === 'loading'

	return (
		<div
			className="rounded-md border border-ops-border/80 bg-ops-surface/30 px-3 py-2"
			aria-label="Suggested vehicles"
		>
			<p className="text-xs font-medium uppercase tracking-wide text-ops-muted">Suggested vehicles</p>
			{showLoading ? (
				<p className="mt-1 text-xs text-ops-muted">Loading suggestions…</p>
			) : null}
			{showError && state.phase === 'error' ? (
				<p className="mt-1 text-xs text-amber-200/90" role="status">
					{state.message}
				</p>
			) : null}
			{showEmpty ? (
				<p className="mt-1 text-xs text-ops-muted" role="status">
					No ranked suggestions for this booking.
				</p>
			) : null}
			{showList ? (
				<ul className="mt-2 space-y-1.5">
					{suggestions.map((s) => (
						<li key={s.vehicleId}>
							<button
								type="button"
								className={cn(
									'flex w-full flex-col gap-0.5 rounded border border-transparent px-2 py-1.5 text-left text-sm',
									'text-ops-foreground transition-colors hover:border-ops-border hover:bg-ops-surface/60',
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops',
								)}
								onClick={() =>
									onPickSuggestion({
										vehicleId: s.vehicleId,
										score: s.score,
										rank: s.rank,
									})
								}
							>
								<span className="font-medium leading-tight">
									{displayNameForVehicle(s.vehicleId)}{' '}
									<span className="font-normal text-ops-muted">· {s.score}</span>
								</span>
								<span className="line-clamp-1 text-xs text-ops-muted" title={s.rationale}>
									{s.rationale}
								</span>
							</button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	)
}
