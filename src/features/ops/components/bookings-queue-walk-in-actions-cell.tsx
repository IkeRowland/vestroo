'use client'

import type { ReactNode } from 'react'

/**
 * Prevents row click navigation when interacting with walk-in row actions on the mixed
 * bookings queue (`/ops/bookings`).
 */
export function BookingsQueueStopNavCell({ children }: { children: ReactNode }) {
	return (
		<td
			className="px-3 py-2 align-top"
			onClick={(e) => e.stopPropagation()}
			onMouseDown={(e) => e.stopPropagation()}
		>
			{children}
		</td>
	)
}
