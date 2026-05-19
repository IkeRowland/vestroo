'use client'

import { useEffect } from 'react'

/**
 * When opening booking detail with `#ops-booking-quote`, scroll after the RSC shell paints
 * (soft navigation does not always apply native hash scrolling).
 */
export function OpsBookingDetailQuoteHashScroll() {
	useEffect(() => {
		if (window.location.hash !== '#ops-booking-quote') {
			return
		}
		const id = window.setTimeout(() => {
			document.getElementById('ops-booking-quote')?.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			})
		}, 50)
		return () => window.clearTimeout(id)
	}, [])

	return null
}
