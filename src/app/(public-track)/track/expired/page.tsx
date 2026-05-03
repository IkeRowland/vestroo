import type { Metadata } from 'next'

import { TrackTokenInvalidAccessibleSurface } from '@/features/rider-tracking/components/TrackTokenInvalidPanel'
import { trackTokenInvalidMetadata } from '@/features/rider-tracking/lib/track-token-invalid-metadata'
import { resolveSupportEmailAddress } from '@/lib/email/email-copy'

export const metadata: Metadata = trackTokenInvalidMetadata()

/**
 * Dedicated “link expired” entry (Epic 15 / **15B.7**). Same support wiring as **`/track/[token]`**
 * invalid branch — no token segment (e.g. bookmarks or ops comms).
 */
export default function TrackExpiredPage() {
	const supportEmail = resolveSupportEmailAddress()
	return <TrackTokenInvalidAccessibleSurface supportEmail={supportEmail} />
}
