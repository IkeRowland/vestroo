/**
 * Human-readable labels for `bookings.booking_intent` (canonical DB values).
 * See `supabase/migrations/20260418200000_fe104_trip_request_booking_intent.sql`.
 *
 * Display derivation: `null` is shown as **Standard** (legacy or unset intent treated as standard web booking).
 */
const BOOKING_INTENT_LABELS: Record<string, string> = {
	point_to_point: 'Point to point',
	hourly_hire: 'Hourly hire',
	corporate_pattern: 'Corporate pattern',
	experience_package: 'Experience package',
	trip_request: 'Trip request',
}

export function formatBookingIntentLabel(intent: string | null): string {
	if (intent == null || intent === '') {
		return 'Standard'
	}
	return BOOKING_INTENT_LABELS[intent] ?? intent.replace(/_/g, ' ')
}
