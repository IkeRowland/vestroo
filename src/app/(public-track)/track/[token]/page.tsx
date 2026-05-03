import type { Metadata } from 'next'

import { RiderTrackShell } from '@/features/rider-tracking/components/RiderTrackShell'
import { TrackTokenInvalidAccessibleSurface } from '@/features/rider-tracking/components/TrackTokenInvalidPanel'
import {
	loadPublicRiderTrackViewForRequest,
} from '@/features/rider-tracking/lib/load-public-rider-track-view'
import { trackTokenInvalidMetadata } from '@/features/rider-tracking/lib/track-token-invalid-metadata'
import { resolveSupportEmailAddress } from '@/lib/email/email-copy'

export const dynamic = 'force-dynamic'

type PageProps = {
	params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { token: rawToken } = await params
	const result = await loadPublicRiderTrackViewForRequest(rawToken)
	if (!result.ok) {
		return trackTokenInvalidMetadata()
	}
	return {
		title: 'Trip tracking | Vestroo',
	}
}

export default async function RiderTrackPage({ params }: PageProps) {
	const { token: rawToken } = await params
	const supportEmail = resolveSupportEmailAddress()
	const result = await loadPublicRiderTrackViewForRequest(rawToken)

	if (!result.ok) {
		return <TrackTokenInvalidAccessibleSurface supportEmail={supportEmail} />
	}

	return <RiderTrackShell initial={result.data} rawToken={rawToken} supportEmail={supportEmail} />
}
