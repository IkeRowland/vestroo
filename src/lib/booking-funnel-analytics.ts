/**
 * FE.19.10 — trip-request funnel analytics: typed events, no PII, env kill-switch + variant.
 * Transport: optional `window.__VESTROO_TRACK_BOOKING_FUNNEL__` hook; tests use {@link __setBookingFunnelAnalyticsSinkForTests}.
 */

import { isPurchaseOrderRequiredSubmitError } from '@/lib/account-po-policy'

/** Truthy env parsing (same convention as `NEXT_PUBLIC_OPS_DISPATCH_BOARD_NAV_ENABLED`). */
export function isBookingFunnelAnalyticsEnabled(): boolean {
	const v = process.env.NEXT_PUBLIC_BOOKING_FUNNEL_ANALYTICS_ENABLED
	if (v === undefined) return false
	const t = v.trim().toLowerCase()
	return t === '1' || t === 'true' || t === 'yes' || t === 'on'
}

/** A/B variant string (default = current four-slide trip-request funnel). */
export function getBookingFunnelVariant(): string {
	const v = process.env.NEXT_PUBLIC_BOOKING_FUNNEL_VARIANT?.trim()
	return v && v.length > 0 ? v : 'v_booking_slides_v2'
}

export const BOOKING_FUNNEL_EVENT_NAMES = [
	'booking_funnel_view',
	'booking_funnel_slide_view',
	'booking_funnel_slide_complete',
	'booking_funnel_submit_success',
	'booking_funnel_submit_error',
] as const

export type BookingFunnelEventName = (typeof BOOKING_FUNNEL_EVENT_NAMES)[number]

export type BookingFunnelSubmitErrorCategory =
	| 'validation_client'
	| 'validation_server'
	| 'network'
	| 'purchase_order'
	| 'unknown'

/** Map server/client submit error copy to a closed category — never forward raw `error` strings to analytics. */
export function bookingFunnelSubmitErrorCategoryFromMessage(error: string): BookingFunnelSubmitErrorCategory {
	const t = error.trim()
	if (t === 'Please check your details and try again.') return 'validation_client'
	if (t === 'Please enter a valid phone number for the selected country.') return 'validation_client'
	if (isPurchaseOrderRequiredSubmitError(t)) return 'purchase_order'
	if (t === 'Could not verify organisation billing rules. Please try again.') return 'validation_server'
	if (t === 'We could not save your request. Please try again shortly.') return 'validation_server'
	if (t === 'Something went wrong. Please try again.') return 'unknown'
	const lower = t.toLowerCase()
	if (lower.includes('network') || lower.includes('fetch failed') || lower.includes('econnrefused'))
		return 'network'
	/** Enrich / account messages may be dynamic — avoid attributing PII-bearing text to a specific bucket. */
	return 'unknown'
}

const FORBIDDEN_PAYLOAD_KEY = new RegExp(
	[
		'email',
		'phone',
		'name',
		'address',
		'street',
		'pickup',
		'destination',
		'customer',
		'passenger',
		'first',
		'last',
		'place',
		'location',
		'instruction',
		'flight',
	].join('|'),
	'i',
)

export function assertBookingFunnelPayloadHasNoForbiddenKeys(
	payload: Record<string, unknown>,
): void {
	if (process.env.NODE_ENV === 'production') return
	for (const key of Object.keys(payload)) {
		if (FORBIDDEN_PAYLOAD_KEY.test(key)) {
			throw new Error(`[booking-funnel-analytics] forbidden key in payload: ${key}`)
		}
	}
}

type FunnelViewPayload = { variant: string; embedded?: boolean }
type SlidePayload = { slide_index: 1 | 2 | 3 | 4; variant: string; embedded?: boolean }
type SlideCompletePayload = { slide_index: 1 | 2 | 3; variant: string; embedded?: boolean }
type SubmitSuccessPayload = {
	variant: string
	booking_reference: string
	time_to_submit_ms: number
}

type AnalyticsSink = (event: { name: BookingFunnelEventName; properties: Record<string, unknown> }) => void

let testSink: AnalyticsSink | null = null

/** Test-only: capture events without enabling `NEXT_PUBLIC_BOOKING_FUNNEL_ANALYTICS_ENABLED`. */
export function __setBookingFunnelAnalyticsSinkForTests(sink: AnalyticsSink | null): void {
	testSink = sink
}

function emit(name: BookingFunnelEventName, properties: Record<string, unknown>): void {
	assertBookingFunnelPayloadHasNoForbiddenKeys(properties)
	if (testSink) {
		testSink({ name, properties: { ...properties } })
	}
	const enabled = isBookingFunnelAnalyticsEnabled()
	const debug =
		process.env.NODE_ENV === 'development' &&
		process.env.NEXT_PUBLIC_BOOKING_FUNNEL_ANALYTICS_DEBUG?.trim().toLowerCase() === '1'
	if (debug) {
		console.info('[booking-funnel]', name, properties)
	}
	if (!enabled) return
	if (typeof window === 'undefined') return
	const fn = (
		window as unknown as {
			__VESTROO_TRACK_BOOKING_FUNNEL__?: (e: {
				name: BookingFunnelEventName
				properties: Record<string, unknown>
			}) => void
		}
	).__VESTROO_TRACK_BOOKING_FUNNEL__
	fn?.({ name, properties: { ...properties } })
}

export function trackBookingFunnelView(properties: FunnelViewPayload): void {
	emit('booking_funnel_view', { ...properties })
}

export function trackBookingFunnelSlideView(properties: SlidePayload): void {
	emit('booking_funnel_slide_view', { ...properties })
}

export function trackBookingFunnelSlideComplete(properties: SlideCompletePayload): void {
	emit('booking_funnel_slide_complete', { ...properties })
}

export function trackBookingFunnelSubmitSuccess(properties: SubmitSuccessPayload): void {
	emit('booking_funnel_submit_success', { ...properties })
}

export function trackBookingFunnelSubmitError(properties: SubmitErrorPayload): void {
	emit('booking_funnel_submit_error', { ...properties })
}
