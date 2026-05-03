'use client'

import Link from 'next/link'

type PanelProps = {
	supportEmail: string
	/**
	 * Use **`h2`** when the route exposes a page-level **`sr-only` `h1`** (15B.7 — heading order).
	 * @default 'h1'
	 */
	titleLevel?: 'h1' | 'h2'
	/** Land keyboard focus on the primary CTA when the surface mounts (15B.7). */
	autoFocusPrimaryCta?: boolean
}

/**
 * Shared invalid/expired card (Epic 15 / 15B.3 — US-C2, 15B.7 handoff). No trip or PII.
 * Prefer **`TrackTokenInvalidAccessibleSurface`** from pages for landmarks / heading order.
 */
export function TrackTokenInvalidPanel({
	supportEmail,
	titleLevel = 'h1',
	autoFocusPrimaryCta = false,
}: PanelProps) {
	const TitleTag = titleLevel === 'h2' ? 'h2' : 'h1'
	return (
		<div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
			<TitleTag className="text-xl font-semibold text-gray-900">Link expired or invalid</TitleTag>
			<p className="mt-3 text-sm leading-relaxed text-gray-600">
				This tracking link is no longer valid. For your privacy we cannot show trip details here.
			</p>
			<p className="mt-4 text-sm text-gray-600">
				Please contact our team and we will help you another way.
			</p>
			<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
				<a
					href={`mailto:${supportEmail}`}
					autoFocus={autoFocusPrimaryCta}
					className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
				>
					Email support
				</a>
				<Link
					href="/contact"
					className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
				>
					Contact page
				</Link>
			</div>
		</div>
	)
}

type SurfaceProps = {
	supportEmail: string
}

/**
 * Page-level landmarks for invalid/expired track (15B.7): **`main`**, **`sr-only` `h1`**, visible
 * title as **`h2`**, primary CTA focus. Safe for server and client parents.
 */
export function TrackTokenInvalidAccessibleSurface({ supportEmail }: SurfaceProps) {
	return (
		<main
			id="track-token-invalid"
			className="mx-auto w-full max-w-md outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 rounded-lg"
		>
			<h1 className="sr-only">Trip tracking unavailable</h1>
			<TrackTokenInvalidPanel
				supportEmail={supportEmail}
				titleLevel="h2"
				autoFocusPrimaryCta
			/>
		</main>
	)
}
