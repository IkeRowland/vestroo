'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

type BookingsQueueTableRowProps = {
	bookingId: string
	/** Payment reference when present — surfaced for E2E (Epic 12 / Story 12.9). */
	paymentReference?: string | null
	/**
	 * Override row navigation (default: booking detail on `/ops/bookings/[id]`).
	 * Example: Fulfil Assignment (paid) for **Ready to assign** preset (Story 14.8).
	 */
	navigateHref?: string
	children: ReactNode
}

/**
 * Row click / Enter navigates to booking detail placeholder (Story 12.3 AC6).
 * Inner links must call stopPropagation.
 */
export function BookingsQueueTableRow({
	bookingId,
	paymentReference,
	navigateHref: navigateHrefOverride,
	children,
}: BookingsQueueTableRowProps) {
	const router = useRouter()
	const href =
		navigateHrefOverride ??
		`/ops/bookings/${encodeURIComponent(bookingId)}`

	const rowAriaLabel = navigateHrefOverride
		? `Open Fulfil assignment for booking ${bookingId.slice(0, 8)}…`
		: `Open booking ${bookingId.slice(0, 8)}…`

	return (
		<tr
			className="cursor-pointer border-b border-ops-border/80 transition-colors hover:bg-ops-accent-soft"
			data-testid="ops-bookings-queue-row"
			data-booking-id={bookingId}
			data-payment-reference={paymentReference ?? ''}
			role="link"
			tabIndex={0}
			aria-label={rowAriaLabel}
			onClick={() => {
				router.push(href)
			}}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					router.push(href)
				}
			}}
		>
			{children}
		</tr>
	)
}
