/**
 * US-C1 (15B.4): when a trip is `en_route`, notify rider with a short /track link.
 * All errors are caught — never throw past the chauffeur Server Action (no trip rollback).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

import { absoluteUrl } from '@/lib/site-url'
import {
  riderTrackTokenExpMsFromTripEndEstimateIso,
  signRiderTrackToken,
} from '@/lib/tracking-tokens'
import { formatToE164OrNull, sendTransactionalSms } from '@/services/sms'

export async function sendEnRouteRiderTrackSmsIfApplicable(
  supabase: SupabaseClient,
  tripId: string
): Promise<void> {
  try {
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('id, time_end_estimate')
      .eq('id', tripId)
      .maybeSingle()

    if (tripErr || !trip) {
      console.error('[vestroo:sms] en_route_trip_load_failed', { trip_id: tripId, message: tripErr?.message })
      return
    }

    const timeEndEstimate = trip.time_end_estimate as string | null
    if (!timeEndEstimate) {
      console.error('[vestroo:sms] en_route_skip_missing_time_end_estimate', { trip_id: tripId })
      return
    }

    const { data: linkRow, error: btErr } = await supabase
      .from('booking_trips')
      .select('booking_id')
      .eq('trip_id', tripId)
      .limit(1)
      .maybeSingle()

    if (btErr) {
      console.error('[vestroo:sms] en_route_booking_trips_failed', { trip_id: tripId, message: btErr.message })
      return
    }

    const bookingId = linkRow?.booking_id as string | undefined
    if (!bookingId) {
      console.info('[vestroo:sms] en_route_no_booking_for_trip', { trip_id: tripId })
      return
    }

    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('rider_phone')
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking) {
      console.error('[vestroo:sms] en_route_booking_load_failed', { trip_id: tripId, booking_id: bookingId, message: bErr?.message })
      return
    }

    const riderPhone = (booking as { rider_phone: string | null }).rider_phone
    if (!riderPhone || !String(riderPhone).trim()) {
      console.info('[vestroo:sms] en_route_rider_phone_unset', { trip_id: tripId, booking_id: bookingId })
      return
    }

    const toE164 = formatToE164OrNull(riderPhone)
    if (!toE164) {
      console.info('[vestroo:sms] en_route_rider_phone_invalid', {
        trip_id: tripId,
        booking_id: bookingId,
      })
      return
    }

    const exp = riderTrackTokenExpMsFromTripEndEstimateIso(timeEndEstimate)
    const token = signRiderTrackToken({
      trip_id: tripId,
      purpose: 'rider_track',
      exp,
    })
    const trackPath = `/track/${encodeURIComponent(token)}`
    const shortUrl = absoluteUrl(trackPath)

    const body = `Vestroo: your driver is en route. Live trip link: ${shortUrl}`

    await sendTransactionalSms({
      toE164,
      body,
      idempotencyKey: `en_route_sms:${tripId}`,
      correlationId: tripId,
      correlationKind: 'trip',
    })
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    console.error('[vestroo:sms] en_route_sms_unexpected (non-fatal)', {
      trip_id: tripId,
      error: m,
    })
  }
}
