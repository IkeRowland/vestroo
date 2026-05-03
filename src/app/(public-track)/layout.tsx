import type { ReactNode } from 'react'

/**
 * Public rider track (**`/track/[token]`**, **`/track/expired`**) — Epic 15 / 15B.3 + **15B.7**.
 * Dedicated group avoids **`(app)`** booking shell and keeps the page anonymous-friendly.
 */
export default function PublicTrackLayout({ children }: { children: ReactNode }) {
	return <div className="min-h-screen bg-gray-50 py-10 px-4">{children}</div>
}
