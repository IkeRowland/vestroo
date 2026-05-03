import type { Metadata } from 'next'

/**
 * Shared **`noindex`** metadata for invalid/expired rider track surfaces (Epic 15 / **15B.7** — US-C2, Q21).
 * Used by **`/track/[token]`** when the token gate fails and by **`/track/expired`**.
 */
export function trackTokenInvalidMetadata(): Metadata {
	return {
		title: 'Link expired or invalid | Vestroo',
		robots: { index: false, follow: false },
	}
}
