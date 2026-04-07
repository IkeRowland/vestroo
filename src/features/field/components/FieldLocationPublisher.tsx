'use client'

import { useEffect, useRef } from 'react'

import { publishChauffeurLocationAction } from '@/actions/fieldLocation'

/** Client debounce: one publish every N ms (see `docs/realtime-and-notifications.md`). */
export const FIELD_LOCATION_PUBLISH_INTERVAL_MS = 8_000

type Props = {
	tripId: string
	enabled: boolean
}

/**
 * Watches geolocation and periodically sends the latest fix to the server action
 * (throttled again server-side).
 */
export function FieldLocationPublisher({ tripId, enabled }: Props) {
	const latest = useRef<{ lat: number; lng: number; acc?: number } | null>(null)

	useEffect(() => {
		if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
			return
		}

		const watchId = navigator.geolocation.watchPosition(
			(pos) => {
				latest.current = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
					acc: pos.coords.accuracy,
				}
			},
			() => {
				/* user denied or timeout — silent */
			},
			{ enableHighAccuracy: false, maximumAge: 30_000, timeout: 25_000 },
		)

		const tick = () => {
			const p = latest.current
			if (!p) {
				return
			}
			void publishChauffeurLocationAction({
				tripId,
				latitude: p.lat,
				longitude: p.lng,
				accuracyM: p.acc,
			})
		}

		const intervalId = window.setInterval(tick, FIELD_LOCATION_PUBLISH_INTERVAL_MS)

		return () => {
			navigator.geolocation.clearWatch(watchId)
			window.clearInterval(intervalId)
		}
	}, [tripId, enabled])

	return null
}
