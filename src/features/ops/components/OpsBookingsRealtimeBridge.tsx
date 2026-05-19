'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
import { createClientClient } from '@/lib/supabase/client'
import { removeRealtimeChannel, subscribeBookingsQueueLive } from '@/lib/supabase/realtime'

/** Coalesce rapid Realtime bursts before `router.refresh()` (see `docs/realtime-and-notifications.md`). */
const OPS_BOOKINGS_REALTIME_DEBOUNCE_MS = 2_000

/**
 * Ops staff session: subscribes to `bookings`, `trips`, and `booking_trips` changes and debounces RSC refresh.
 * Surfaces subscription faults with `OpsErrorState` (Try again + hub link), matching `OpsBoardRealtimeBridge`.
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
					'Realtime connection issue. The bookings list may be out of date until the connection recovers or you try again.',
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
				router.refresh()
			}, OPS_BOOKINGS_REALTIME_DEBOUNCE_MS)
		}

		tearingDownRef.current = false
		channelStatusRef.current = undefined

		const ch = subscribeBookingsQueueLive(supabase, {
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
	}, [router, reconcileChannelHealth])

	if (!subscriptionFault) {
		return null
	}

	return (
		<div className="mt-2">
			<OpsErrorState
				variant="subscription"
				message={subscriptionFault.message}
				sanitizeMessage={false}
				correlationId={subscriptionFault.correlationId}
				onRetry={() => router.refresh()}
				secondaryAction={{ label: 'Ops home', href: '/ops' }}
			/>
		</div>
	)
}
