'use server'

import {
	loadPublicRiderTrackView,
	type LoadPublicRiderTrackResult,
} from '@/features/rider-tracking/lib/load-public-rider-track-view'

/** 30s poll from **`RiderTrackShell`** — same token gate as the RSC loader. */
export async function riderTrackPollAction(rawToken: string): Promise<LoadPublicRiderTrackResult> {
	return loadPublicRiderTrackView(rawToken)
}
