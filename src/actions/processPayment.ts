'use server';

import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import {
  generatePayFastSignature,
  PayFastPaymentParams,
  resolvePayFastProcessBaseUrl,
} from '@/lib/payfast';
import {
  webBookingPayloadSchema,
  experiencePackageBookingMetadataSchema,
  type WebBookingPayload,
  type ExperiencePackageBookingMetadata,
} from '@/actions/booking-schemas';
import { reconcileBookingQuote } from '@/lib/booking-quote-reconcile';
import type { QuoteLocation } from '@/lib/booking-quote-types';
import { notifyBookingCreatedSmsStub } from '@/services/sms-stub';
import {
  experiencePackageStubLocations,
  fetchExperiencePackageById,
} from '@/lib/experience-package-data';

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
 * Reconciles quote server-side, creates pending booking, returns PayFast params.
 * PayFast amount uses reconciled total only — never the raw client quote.
 */
export async function processPayment(bookingState: unknown) {
  try {
    const validatedData = webBookingPayloadSchema.parse(bookingState);

    let originForRow = validatedData.origin;
    let destinationForRow: QuoteLocation;
    let experiencePayfastTitle: string | null = null;
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
      experiencePayfastTitle = pkg.title;
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
      status: 'pending',
      payment_status: 'pending',
      payment_reference: bookingReference,
      booking_intent: validatedData.bookingIntent,
      hourly_duration_hours: validatedData.hourlyDurationHours ?? null,
      hourly_service_area_notes: validatedData.hourlyServiceAreaNotes ?? null,
      service_pattern_id: validatedData.servicePatternId ?? null,
      booking_metadata: bookingMetadataPersisted,
      invoice_requested: validatedData.invoiceRequested ?? false,
      purchase_order_ref: validatedData.purchaseOrderRef?.trim() || null,
      billing_entity_ref: validatedData.billingEntityRef?.trim() || null,
      created_at: new Date().toISOString(),
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('id')
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      return {
        success: false,
        error: 'Failed to create booking. Please try again.',
      };
    }

    const bookingId = booking.id;

    await notifyBookingCreatedSmsStub({
      bookingId,
      customerPhone: validatedData.customer.phone,
    });

    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    if (!merchantId || !merchantKey || !passphrase) {
      console.error('Missing PayFast configuration');
      return {
        success: false,
        error: 'Payment configuration error. Please contact support.',
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const amountStr = reconciled.serverTotalZar.toFixed(2);

    const payfastParams: Omit<PayFastPaymentParams, 'signature'> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${baseUrl}/confirmation?id=${bookingId}`,
      cancel_url: `${baseUrl}/book/payment?error=cancelled`,
      notify_url: `${baseUrl}/api/payfast/webhook`,
      name_first: validatedData.customer.name.split(' ')[0] || validatedData.customer.name,
      name_last: validatedData.customer.name.split(' ').slice(1).join(' ') || '',
      email_address: validatedData.customer.email,
      cell_number: validatedData.customer.phone,
      m_payment_id: bookingId,
      amount: amountStr,
      item_name:
        validatedData.bookingIntent === 'experience_package' &&
        experiencePayfastTitle
          ? `Vestroo experience — ${experiencePayfastTitle}`
          : `Vestroo booking — ${originForRow.name} to ${destinationForRow.name}`,
    };

    const signature = generatePayFastSignature(payfastParams, passphrase);

    const payfastData: PayFastPaymentParams = {
      ...payfastParams,
      signature,
    };

    return {
      success: true,
      bookingId,
      payfastData,
      payfastProcessBaseUrl: resolvePayFastProcessBaseUrl(),
    };
  } catch (error) {
    console.error('Error processing payment:', error);

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
