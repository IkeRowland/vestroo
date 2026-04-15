'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClientClient } from '@/lib/supabase/client'
import {
	removeRealtimeChannel,
	subscribeTripsBoard,
	subscribeVehicleTrackings,
} from '@/lib/supabase/realtime'

/** Coalesce rapid Realtime bursts before `router.refresh()` (see `docs/realtime-and-notifications.md`). */
const OPS_BOARD_REALTIME_DEBOUNCE_MS = 2_000

type EtaRow = {
	vehicle_id: string
	estimated_arrival: string | null
	updated_at: string
}

function formatEta(iso: string | null): string {
	if (!iso) {
		return '—'
	}
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) {
		return '—'
	}
	return d.toLocaleString()
}

/**
 * Ops staff JWT only: subscribes to `trips` and `vehicle_trackings` changes and refreshes the RSC tree.
 * Shows a short ETA strip from `vehicle_trackings.estimated_arrival` (staff precision).
 */
export function OpsBoardRealtimeBridge() {
	const router = useRouter()
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const [etas, setEtas] = useState<EtaRow[]>([])

	const loadEtas = useCallback(async () => {
		const supabase = createClientClient()
		const { data } = await supabase
			.from('vehicle_trackings')
			.select('vehicle_id, estimated_arrival, updated_at')
			.eq('is_active', true)
			.order('updated_at', { ascending: false })
			.limit(8)
		setEtas(
			(data ?? []).map((r) => ({
				vehicle_id: String(r.vehicle_id),
				estimated_arrival: r.estimated_arrival ? String(r.estimated_arrival) : null,
				updated_at: String(r.updated_at),
			})),
		)
	}, [])

	useEffect(() => {
		void loadEtas()
	}, [loadEtas])

	useEffect(() => {
		const supabase = createClientClient()
		const scheduleRefresh = () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
			}
			debounceRef.current = setTimeout(() => {
				debounceRef.current = null
				void loadEtas()
				router.refresh()
			}, OPS_BOARD_REALTIME_DEBOUNCE_MS)
		}

		const chTrips = subscribeTripsBoard(supabase, { onPayload: scheduleRefresh })
		const chTrack = subscribeVehicleTrackings(supabase, { onPayload: scheduleRefresh })

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
			}
			removeRealtimeChannel(supabase, chTrips)
			removeRealtimeChannel(supabase, chTrack)
		}
	}, [router, loadEtas])

	return (
		<div className="mt-2 space-y-2">
			<p className="text-xs text-ops-muted">
				Live updates: Realtime → debounced refresh ({OPS_BOARD_REALTIME_DEBOUNCE_MS / 1000}s). Polling
				fallback: see <span className="font-mono text-ops-muted">docs/ops-console.md</span>.
			</p>
			{etas.length > 0 ? (
				<div className="rounded-md border border-ops-border bg-muted/60 p-3">
					<p className="text-xs font-medium uppercase tracking-wide text-ops-muted">
						Recent vehicle ETAs (from tracking)
					</p>
					<ul className="mt-2 space-y-1 text-xs text-ops-foreground">
						{etas.map((r) => (
							<li key={`${r.vehicle_id}-${r.updated_at}`} className="flex justify-between gap-2">
								<span className="font-mono text-ops-muted">{r.vehicle_id.slice(0, 8)}…</span>
								<span>ETA {formatEta(r.estimated_arrival)}</span>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	)
}
