'use client'

/**
 * Live updates: **30s** server-action poll reuses **`loadPublicRiderTrackView`** (token gate on every tick).
 * Supabase **Realtime** on `trips` is deferred: the browser uses the anon key under RLS and cannot receive
 * trip row changes for anonymous riders without a new token-gated channel or RPC (see story Progress Notes).
 */
import { useEffect, useState, useTransition } from 'react'

import { riderTrackPollAction } from '@/actions/riderTrackPoll'

import type { PublicRiderTrackDto } from '../lib/public-rider-track-dto'
import { shouldRenderLiveLocationMap } from '../lib/rider-live-location-gate'
import { DriverVehicleCard } from './DriverVehicleCard'
import { LiveLocationMap } from './LiveLocationMap'
import { MilestoneTimeline } from './MilestoneTimeline'
import { TrackTokenInvalidAccessibleSurface } from './TrackTokenInvalidPanel'

type Props = {
	initial: PublicRiderTrackDto
	rawToken: string
	supportEmail: string
}

export function RiderTrackShell({ initial, rawToken, supportEmail }: Props) {
	const [invalidSession, setInvalidSession] = useState(false)
	const [dto, setDto] = useState(initial)
	const [, startTransition] = useTransition()

	useEffect(() => {
		const id = window.setInterval(() => {
			startTransition(() => {
				void riderTrackPollAction(rawToken).then((res) => {
					if (!res.ok) {
						setInvalidSession(true)
						return
					}
					setDto(res.data)
				})
			})
		}, 30_000)
		return () => window.clearInterval(id)
	}, [rawToken])

	if (invalidSession) {
		return <TrackTokenInvalidAccessibleSurface supportEmail={supportEmail} />
	}

	return (
		<div className="mx-auto max-w-lg space-y-8">
			<header className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
				<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Trip status</p>
				<h1 className="mt-1 text-2xl font-semibold capitalize text-gray-900">
					{dto.status.replace(/_/g, ' ')}
				</h1>
				<p className="mt-1 text-sm text-gray-600">{dto.serviceTypeLabel}</p>
				{dto.cancelled ? (
					<p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
						This trip was cancelled. The timeline below is shown for context only.
					</p>
				) : null}
			</header>
			<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
				<MilestoneTimeline milestones={dto.milestones} />
			</div>
			{dto.livePosition != null && shouldRenderLiveLocationMap(dto.livePosition) ? (
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<LiveLocationMap
						lat={dto.livePosition.lat}
						lng={dto.livePosition.lng}
						updatedAtIso={dto.livePosition.updatedAtIso}
					/>
				</div>
			) : null}
			<DriverVehicleCard dto={dto} />
		</div>
	)
}
