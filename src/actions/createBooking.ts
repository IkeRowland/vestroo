'use server';

import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import {
  webBookingPayloadSchema,
  experiencePackageBookingMetadataSchema,
  webBookingRiderToDbColumns,
  type WebBookingPayload,
  type ExperiencePackageBookingMetadata,
} from '@/actions/booking-schemas';
import { enrichWebBookingWithClientType } from '@/actions/booking-client-type-enrich';
import { isPortalActiveAccountBookingInsert } from '@/lib/account-portal-booking-insert';
import { assertPurchaseOrderForAccountBookingInsert } from '@/lib/account-po-policy';
import { reconcileBookingQuote } from '@/lib/booking-quote-reconcile';
import type { QuoteLocation } from '@/lib/booking-quote-types';
import { notifyBookingCreatedSms } from '@/services/sms';
import {
  experiencePackageStubLocations,
  fetchExperiencePackageById,
} from '@/lib/experience-package-data';
import {
  isQuoteFirstForNonTrivialIntentsEnabled,
  isQuoteFirstNonTrivialBookingIntent,
} from '@/lib/quote-first-non-trivial-intents';

function resolveDestinationForRow(payload: WebBookingPayload): QuoteLocation {
  if (payload.destination) {
    return payload.destination;
  }
  if (payload.bookingIntent === 'hourly_hire') {
    return {
      placeId: 'hourly-as-directed',
      formattedAddress: `Hourly hire — as directed (${payload.origin.formattedAddress})`,
      name: 'As directed (hourly hire)',
      latitude: payload.origin.latitude,
      longitude: payload.origin.longitude,
    };
  }
  throw new Error('Destination is required');
}

/**
 * Create booking without a checkout redirect (pending payment / ops follow-up). Epic 16 /
 * Theme N — settlement is recorded out of band by ops via `markBookingPaymentReceived` (US-N3).
 * Quote totals are reconciled server-side — client `quoteAmount` is not trusted.
 */
export async function createBooking(bookingState: unknown) {
  try {
    const validatedData = webBookingPayloadSchema.parse(bookingState);

    let originForRow = validatedData.origin;
    let destinationForRow: QuoteLocation;
    let experienceMeta: ExperiencePackageBookingMetadata | null = null;

    if (validatedData.bookingIntent === 'experience_package') {
      experienceMeta = experiencePackageBookingMetadataSchema.parse(
        validatedData.bookingMetadata
      );
      const pkg = await fetchExperiencePackageById(
        experienceMeta.experience_package_id
      );
      if (!pkg) {
        return {
          success: false,
          error: 'This experience package is not available.',
        };
      }
      const stubs = experiencePackageStubLocations(pkg);
      originForRow = stubs.origin;
      destinationForRow = stubs.destination;
    } else {
      destinationForRow = resolveDestinationForRow(validatedData);
    }

    const reconciled = await reconcileBookingQuote({
      bookingIntent: validatedData.bookingIntent,
      clientQuoteZar: validatedData.quoteAmount,
      origin: originForRow,
      destination:
        validatedData.bookingIntent === 'hourly_hire' ? null : destinationForRow,
      date: validatedData.date,
      passengers: validatedData.passengers,
      selectedVehicleId: validatedData.selectedVehicleId,
      hourlyDurationHours: validatedData.hourlyDurationHours,
      experiencePackage: experienceMeta,
    });

    const supabase = await createServerClient();

    const bookingReference = `VST-${Date.now().toString().slice(-8)}`;

    const bookingMetadataPersisted =
      validatedData.bookingIntent === 'experience_package' && experienceMeta
        ? { ...experienceMeta }
        : validatedData.bookingMetadata ?? {};

    let clientTyped;
    try {
      clientTyped = await enrichWebBookingWithClientType(validatedData, bookingMetadataPersisted);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not validate account selection.';
      return { success: false, error: msg };
    }

    const poCheck = await assertPurchaseOrderForAccountBookingInsert(supabase, {
      clientType: clientTyped.client_type,
      customerAccountId: clientTyped.customer_account_id,
      purchaseOrderRef: validatedData.purchaseOrderRef,
    });
    if (!poCheck.ok) {
      return { success: false, error: poCheck.message };
    }

    const useQuoteFirst =
      isQuoteFirstNonTrivialBookingIntent(validatedData.bookingIntent) &&
      isQuoteFirstForNonTrivialIntentsEnabled();

    const riderCols = webBookingRiderToDbColumns(validatedData.rider)

    const portalAccountBooking =
      clientTyped.client_type === 'account_client' &&
      isPortalActiveAccountBookingInsert(clientTyped.booking_metadata as Record<string, unknown>);

    const bookingData = {
      origin_place_id: originForRow.placeId,
      origin_address: originForRow.formattedAddress,
      origin_name: originForRow.name,
      origin_latitude: originForRow.latitude,
      origin_longitude: originForRow.longitude,
      destination_place_id: destinationForRow.placeId,
      destination_address: destinationForRow.formattedAddress,
      destination_name: destinationForRow.name,
      destination_latitude: destinationForRow.latitude,
      destination_longitude: destinationForRow.longitude,
      pickup_datetime: validatedData.date.toISOString(),
      trip_date: validatedData.date.toISOString(),
      passenger_count: validatedData.passengers,
      flight_number: validatedData.flightNumber ?? null,
      vehicle_id: validatedData.selectedVehicleId,
      total_amount: reconciled.serverTotalZar,
      estimated_duration: reconciled.estimatedDurationMinutes,
      distance_km: reconciled.distanceKm,
      customer_name: validatedData.customer.name,
      customer_email: validatedData.customer.email,
      customer_phone: validatedData.customer.phone,
      rider_name: riderCols.rider_name,
      rider_email: riderCols.rider_email,
      rider_phone: riderCols.rider_phone,
      status: portalAccountBooking
        ? 'pending_confirmation'
        : useQuoteFirst
          ? 'submitted'
          : 'pending',
      payment_status: 'pending',
      payment_reference: bookingReference,
      booking_intent: validatedData.bookingIntent,
      hourly_duration_hours: validatedData.hourlyDurationHours ?? null,
      hourly_service_area_notes: validatedData.hourlyServiceAreaNotes ?? null,
      service_pattern_id: validatedData.servicePatternId ?? null,
      booking_metadata: clientTyped.booking_metadata,
      client_type: clientTyped.client_type,
      customer_account_id: clientTyped.customer_account_id,
      account_snapshot: clientTyped.account_snapshot,
      invoice_requested: validatedData.invoiceRequested ?? false,
      purchase_order_ref: validatedData.purchaseOrderRef?.trim() || null,
      billing_entity_ref: validatedData.billingEntityRef?.trim() || null,
      created_at: new Date().toISOString(),
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('id, payment_reference')
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      return {
        success: false,
        error: 'Failed to create booking. Please try again.',
      };
    }

    await notifyBookingCreatedSms({
      bookingId: booking.id,
      customerPhone: validatedData.customer.phone,
    });

    return {
      success: true,
      bookingId: booking.id,
      bookingReference: booking.payment_reference || bookingReference,
    };
  } catch (error) {
    console.error('Error creating booking:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid booking data. Please complete all required fields.',
        details: error.errors,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
