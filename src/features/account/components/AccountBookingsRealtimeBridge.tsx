'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClientClient } from '@/lib/supabase/client'
import { removeRealtimeChannel, subscribeBookingsOps } from '@/lib/supabase/realtime'

/** Coalesce rapid Realtime bursts before `router.refresh()` (see `docs/realtime-and-notifications.md`). */
const ACCOUNT_BOOKINGS_REALTIME_DEBOUNCE_MS = 2_000

/**
 * Account portal: `bookings` INSERT/UPDATE for the active account (RLS-scoped JWT).
 * Refreshes list and detail RSC payloads when ops saves quotes or confirms bookings.
 */
export function AccountBookingsRealtimeBridge() {
	const router = useRouter()
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const tearingDownRef = useRef(false)
	const channelStatusRef = useRef<string | undefined>(undefined)
	const [subscriptionFault, setSubscriptionFault] = useState(false)

	const reconcileChannelHealth = useCallback(() => {
		const s = channelStatusRef.current
		if (s == null) {
			return
		}
		const bad = s === 'CHANNEL_ERROR' || s === 'TIMED_OUT'
		const allOk = s === 'SUBSCRIBED'
		if (bad && !tearingDownRef.current) {
			setSubscriptionFault(true)
			return
		}
		if (allOk) {
			setSubscriptionFault(false)
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
			}, ACCOUNT_BOOKINGS_REALTIME_DEBOUNCE_MS)
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
	}, [router, reconcileChannelHealth])

	if (!subscriptionFault) {
		return null
	}

	return (
		<div
			className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-account-foreground"
			role="status"
		>
			Live updates are temporarily unavailable. Refresh the page if booking status or amounts look out of date.
		</div>
	)
}
