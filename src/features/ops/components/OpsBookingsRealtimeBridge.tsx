'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
import { createClientClient } from '@/lib/supabase/client'
import { removeRealtimeChannel, subscribeBookingsOps } from '@/lib/supabase/realtime'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/** Coalesce rapid Realtime bursts before `router.refresh()` (see `docs/realtime-and-notifications.md`). */
const OPS_BOOKINGS_REALTIME_DEBOUNCE_MS = 2_000

/** If no debounced refresh runs for this long, list data may be stale vs other tabs (parity with board bridge). */
const OPS_BOOKINGS_STALE_SILENCE_MS = 10 * 60 * 1_000

function formatClock(ts: number): string {
	const d = new Date(ts)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleString()
}

/**
 * Ops staff session: subscribes to `bookings` INSERT/UPDATE and debounces RSC refresh.
 * Surfaces subscription faults with `OpsErrorState` (refresh + hub link), matching `OpsBoardRealtimeBridge`.
 */
export function OpsBookingsRealtimeBridge() {
	const router = useRouter()
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const tearingDownRef = useRef(false)
	const channelStatusRef = useRef<string | undefined>(undefined)
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

	const reconcileChannelHealth = useCallback(() => {
		const s = channelStatusRef.current
		if (s == null) {
			return
		}
		const bad = s === 'CHANNEL_ERROR' || s === 'TIMED_OUT'
		const allOk = s === 'SUBSCRIBED'
		if (bad && !tearingDownRef.current) {
			const correlationId = crypto.randomUUID()
			setSubscriptionFault({
				message:
					'Realtime connection issue. The bookings list may be out of date until you refresh.',
				correlationId,
			})
			return
		}
		if (allOk) {
			setSubscriptionFault(null)
		}
	}, [])

	useEffect(() => {
		const supabase = createClientClient()
		const scheduleRefresh = () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
			}
			debounceRef.current = setTimeout(() => {
				debounceRef.current = null
				bumpLive()
				router.refresh()
			}, OPS_BOOKINGS_REALTIME_DEBOUNCE_MS)
		}

		tearingDownRef.current = false
		channelStatusRef.current = undefined

		const ch = subscribeBookingsOps(supabase, {
			onPayload: scheduleRefresh,
			onSubscribeStatus: (st) => {
				if (tearingDownRef.current) {
					return
				}
				channelStatusRef.current = st
				reconcileChannelHealth()
			},
		})

		return () => {
			tearingDownRef.current = true
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
			}
			removeRealtimeChannel(supabase, ch)
		}
	}, [router, bumpLive, reconcileChannelHealth])

	useEffect(() => {
		const id = window.setInterval(() => {
			if (subscriptionFault) {
				return
			}
			const delta = Date.now() - lastLiveRefreshAt
			setStaleHint(delta > OPS_BOOKINGS_STALE_SILENCE_MS)
		}, 30_000)
		return () => window.clearInterval(id)
	}, [lastLiveRefreshAt, subscriptionFault])

	return (
		<div className="mt-2 space-y-2">
			{subscriptionFault ? (
				<OpsErrorState
					variant="subscription"
					message={subscriptionFault.message}
					sanitizeMessage={false}
					correlationId={subscriptionFault.correlationId}
					onRefresh={() => router.refresh()}
					refreshLabel="Refresh page"
					secondaryAction={{ label: 'Ops home', href: '/ops' }}
				/>
			) : null}
			{staleHint && !subscriptionFault ? (
				<Alert
					variant="default"
					className="border-amber-800/50 bg-amber-950/35 text-amber-50"
					role="status"
				>
					<p className="text-sm font-medium text-amber-100">Bookings list may be stale</p>
					<p className="mt-1 text-xs text-amber-100/85">
						No booking changes have triggered a refresh for about{' '}
						{OPS_BOOKINGS_STALE_SILENCE_MS / 60_000} minutes. Last live refresh:{' '}
						{formatClock(lastLiveRefreshAt)}.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-2 border-amber-800/70 bg-transparent text-amber-50 hover:bg-amber-950/60"
						onClick={() => router.refresh()}
					>
						Refresh now
					</Button>
				</Alert>
			) : null}
		</div>
	)
}
