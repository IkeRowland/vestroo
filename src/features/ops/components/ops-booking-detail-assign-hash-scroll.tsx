'use client'

import { useEffect } from 'react'

import { OPS_BOOKING_ASSIGN_ANCHOR_ID } from '@/features/ops/ops-bookings-url'

/**
 * When opening booking detail with `#ops-booking-assign`, scroll after the RSC shell paints
 * (soft navigation does not always apply native hash scrolling).
 */
export function OpsBookingDetailAssignHashScroll() {
	useEffect(() => {
		if (window.location.hash !== `#${OPS_BOOKING_ASSIGN_ANCHOR_ID}`) {
			return
		}
		const id = window.setTimeout(() => {
			document.getElementById(OPS_BOOKING_ASSIGN_ANCHOR_ID)?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			})
		}, 50)
		return () => window.clearTimeout(id)
	}, [])

	return null
}
