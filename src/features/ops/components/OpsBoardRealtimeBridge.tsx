'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
import { createClientClient } from '@/lib/supabase/client'
import { removeRealtimeChannel, subscribeTripsBoard, subscribeVehicleTrackings } from '@/lib/supabase/realtime'
import { Alert } from '@/components/ui/alert'

/** Coalesce rapid Realtime bursts before `router.refresh()` (see `docs/realtime-and-notifications.md`). */
const OPS_BOARD_REALTIME_DEBOUNCE_MS = 2_000

/** If no debounced refresh runs for this long, board data may be stale vs other tabs (AC6). */
const OPS_BOARD_STALE_SILENCE_MS = 10 * 60 * 1_000

type ChKey = 'trips' | 'vehicle_trackings'

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

function formatClock(ts: number): string {
	const d = new Date(ts)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleString()
}

/**
 * Ops staff JWT only: subscribes to `trips` and `vehicle_trackings` changes and refreshes the RSC tree.
 * Surfaces subscription faults with `OpsErrorState` (Try again + hub link). Documents reconnect: Supabase client retries
 * the WebSocket; this UI clears after a successful `SUBSCRIBED` once channels are healthy again.
 */
export function OpsBoardRealtimeBridge() {
	const router = useRouter()
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const tearingDownRef = useRef(false)
	const channelStatusRef = useRef<Partial<Record<ChKey, string>>>({})
	const [etas, setEtas] = useState<EtaRow[]>([])
	const [subscriptionFault, setSubscriptionFault] = useState<{
		message: string
		correlationId: string
	} | null>(null)
	const [lastLiveRefreshAt, setLastLiveRefreshAt] = useState<number>(() => Date.now())
	const [staleHint, setStaleHint] = useState(false)

	const bumpLive = useCallback(() => {
		setLastLiveRefreshAt(Date.now())
		setStaleHint(false)
	}, [])

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
		bumpLive()
	}, [bumpLive])

	useEffect(() => {
		void loadEtas()
	}, [loadEtas])

	const reconcileChannelHealth = useCallback(() => {
		const s = channelStatusRef.current
		const keys: ChKey[] = ['trips', 'vehicle_trackings']
		const bad = keys.some((k) => s[k] === 'CHANNEL_ERROR' || s[k] === 'TIMED_OUT')
		const allOk = keys.every((k) => s[k] === 'SUBSCRIBED')
		if (bad && !tearingDownRef.current) {
			const correlationId = crypto.randomUUID()
			setSubscriptionFault({
				message:
					'Realtime connection issue. Your board may be out of date until the connection recovers or you try again.',
				correlationId,
			})
			return
		}
		if (allOk) {
			setSubscriptionFault(null)
		}
	}, [])

	const onChannelStatus = useCallback(
		(name: ChKey) => (status: string) => {
			if (tearingDownRef.current) {
				return
			}
			channelStatusRef.current[name] = status
			reconcileChannelHealth()
		},
		[reconcileChannelHealth],
	)

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

		tearingDownRef.current = false
		channelStatusRef.current = {}

		const chTrips = subscribeTripsBoard(supabase, {
			onPayload: scheduleRefresh,
			onSubscribeStatus: (st) => onChannelStatus('trips')(st),
		})
		const chTrack = subscribeVehicleTrackings(supabase, {
			onPayload: scheduleRefresh,
			onSubscribeStatus: (st) => onChannelStatus('vehicle_trackings')(st),
		})

		return () => {
			tearingDownRef.current = true
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
			}
			removeRealtimeChannel(supabase, chTrips)
			removeRealtimeChannel(supabase, chTrack)
		}
	}, [router, loadEtas, onChannelStatus])

	useEffect(() => {
		const id = window.setInterval(() => {
			if (subscriptionFault) {
				return
			}
			const delta = Date.now() - lastLiveRefreshAt
			setStaleHint(delta > OPS_BOARD_STALE_SILENCE_MS)
		}, 30_000)
		return () => window.clearInterval(id)
	}, [lastLiveRefreshAt, subscriptionFault])

	const staleAutoRanRef = useRef(false)

	useEffect(() => {
		if (!staleHint) {
			staleAutoRanRef.current = false
			return
		}
		if (staleAutoRanRef.current) {
			return
		}
		staleAutoRanRef.current = true
		void loadEtas()
		router.refresh()
	}, [staleHint, loadEtas, router])

	return (
		<div className="mt-2 space-y-2">
			{subscriptionFault ? (
				<OpsErrorState
					variant="subscription"
					title="Live updates interrupted"
					message={subscriptionFault.message}
					sanitizeMessage={false}
					correlationId={subscriptionFault.correlationId}
					onRetry={() => router.refresh()}
					secondaryAction={{ label: 'Open trips', href: '/ops/trips' }}
				/>
			) : null}
			{staleHint && !subscriptionFault ? (
				<Alert
					variant="default"
					className="border-amber-800/50 bg-amber-950/35 text-amber-50"
					role="status"
				>
					<p className="text-sm font-medium text-amber-100">Board may be stale</p>
					<p className="mt-1 text-xs text-amber-100/85">
						No trip or tracking updates have triggered a live update for about{' '}
						{OPS_BOARD_STALE_SILENCE_MS / 60_000} minutes. Last live update: {formatClock(lastLiveRefreshAt)}.
						We are reloading the latest board data in the background.
					</p>
				</Alert>
			) : null}
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
