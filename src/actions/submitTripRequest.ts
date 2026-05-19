'use server';

import { z } from 'zod';

import { createServerClient } from '@/lib/supabase/server';
import { enrichTripRequestBookingWithClientType } from '@/actions/booking-client-type-enrich';
import { assertPurchaseOrderForAccountBookingInsert } from '@/lib/account-po-policy';
import {
  passengerPhoneToE164,
  tripRequestSubmitPayloadSchema,
} from '@/features/booking/components/trip-request/trip-request-submit-schema';
import { insertTripRequestBooking } from '@/lib/trip-request-booking-insert';

/**
 * Public trip-request funnel (FE.10.4 / FE.10.5): persists Slides 1–3 to `bookings` with
 * `booking_intent = trip_request`. No quote reconciliation, payment redirect, or client-triggered email.
 * **14.7:** When `QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS` is ON (default), `status` is `submitted` so ops sees the row on `/ops/bookings` (same as quote-first walk-in checkout).
 *
 * **Canonical phone:** E.164 in `customer_phone` (and duplicated under `booking_metadata.trip_request`).
 */
export async function submitTripRequest(raw: unknown) {
  try {
    const parsed = tripRequestSubmitPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false as const,
        error: 'Please check your details and try again.',
      };
    }

    const { slide1, slide2, slide3, clientTypeResolution } = parsed.data;
    const e164 = passengerPhoneToE164(slide3.countryIso2, slide3.phoneNational);
    if (!e164) {
      return {
        success: false as const,
        error: 'Please enter a valid phone number for the selected country.',
      };
    }

    const bookingMetadata = {
      trip_request: {
        version: 1 as const,
        slide1,
        slide2,
        slide3: {
          firstName: slide3.firstName,
          lastName: slide3.lastName,
          email: slide3.email,
          countryIso2: slide3.countryIso2,
          customerPhoneE164: e164,
        },
      },
    };

    let clientTyped;
    try {
      clientTyped = await enrichTripRequestBookingWithClientType(
        slide3.email.trim(),
        clientTypeResolution,
        bookingMetadata,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not validate account selection.';
      return {
        success: false as const,
        error: msg,
      };
    }

    const supabase = await createServerClient();
    const poCheck = await assertPurchaseOrderForAccountBookingInsert(supabase, {
      clientType: clientTyped.client_type,
      customerAccountId: clientTyped.customer_account_id,
      purchaseOrderRef: parsed.data.purchaseOrderRef,
    });
    if (!poCheck.ok) {
      return { success: false as const, error: poCheck.message };
    }

    const inserted = await insertTripRequestBooking(supabase, parsed.data, clientTyped);

    if (!inserted.ok) {
      console.error('submitTripRequest insert error:', inserted.error);
      return {
        success: false as const,
        error: 'We could not save your request. Please try again shortly.',
      };
    }

    return {
      success: true as const,
      bookingId: inserted.bookingId,
      bookingReference: inserted.bookingReference,
    };
  } catch (error) {
    console.error('submitTripRequest:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        error: 'Please check your details and try again.',
      };
    }

    return {
      success: false as const,
      error: 'Something went wrong. Please try again.',
    };
  }
}
