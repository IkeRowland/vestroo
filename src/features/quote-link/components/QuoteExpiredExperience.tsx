import Link from 'next/link'

import type { QuoteExpiredTripSummary } from '@/lib/quote-expired-trip'

type QuoteExpiredExperienceProps = {
	prefillHref: string
	tripSummary: QuoteExpiredTripSummary | null
}

/**
 * Epic 14 / Story **14.5** — **US-C4** dedicated expired-quote experience (HMAC or quote window).
 * Prefill link uses trip hints only (**`buildBookSearchPrefillHrefFromBooking`**); no customer PII in URLs (Epic 14 risk note on expired links).
 */
export function QuoteExpiredExperience({ prefillHref, tripSummary }: QuoteExpiredExperienceProps) {
	return (
		<article className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-8 shadow-sm">
			<h1 className="text-xl font-semibold text-gray-900">This quote link has expired</h1>
			<p className="mt-3 text-sm text-gray-700">
				Quotes are time-limited (often about 72 hours). Prices and availability can change after that
				window.
			</p>
			{tripSummary ? (
				<section className="mt-6 rounded-md border border-amber-200/80 bg-white/70 p-4">
					<h2 className="text-sm font-semibold text-gray-900">Trip summary</h2>
					<dl className="mt-3 space-y-2 text-sm text-gray-700">
						<div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
							<dt className="shrink-0 font-medium text-gray-800">From</dt>
							<dd className="min-w-0">{tripSummary.originLabel}</dd>
						</div>
						<div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
							<dt className="shrink-0 font-medium text-gray-800">To</dt>
							<dd className="min-w-0">{tripSummary.destinationLabel}</dd>
						</div>
						{tripSummary.pickupDisplay ? (
							<div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
								<dt className="shrink-0 font-medium text-gray-800">Pickup</dt>
								<dd>{tripSummary.pickupDisplay}</dd>
							</div>
						) : null}
						{tripSummary.passengers != null ? (
							<div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
								<dt className="shrink-0 font-medium text-gray-800">Passengers</dt>
								<dd>{tripSummary.passengers}</dd>
							</div>
						) : null}
					</dl>
				</section>
			) : null}
			<p className="mt-6 text-sm text-gray-700">
				You can start a new booking request with the same trip details (no account required). A fresh
				booking row is created when you complete the form — we do not silently renew this quote.
			</p>
			<p className="mt-6">
				<Link
					href={prefillHref}
					className="inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
				>
					Request a new quote
				</Link>
			</p>
		</article>
	)
}
