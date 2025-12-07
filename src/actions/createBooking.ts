'use server';

import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Booking state validation schema
 */
const bookingStateSchema = z.object({
  origin: z.object({
    placeId: z.string(),
    formattedAddress: z.string(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  destination: z.object({
    placeId: z.string(),
    formattedAddress: z.string(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  date: z.date(),
  passengers: z.number().min(1),
  flightNumber: z.string().nullable(),
  selectedVehicleId: z.string(),
  quoteAmount: z.number().positive(),
  estimatedDuration: z.number().nullable(),
  distance: z.number().nullable(),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }),
});

/**
 * Create booking without payment processing
 * Returns booking ID for confirmation page
 */
export async function createBooking(bookingState: unknown) {
  try {
    // Validate input data
    const validatedData = bookingStateSchema.parse(bookingState);

    // Validate amount matches quote
    if (validatedData.quoteAmount <= 0) {
      return {
        success: false,
        error: 'Invalid booking amount',
      };
    }

    // Create Supabase client
    const supabase = await createServerClient();

    // Create booking record in Supabase with status 'pending'
    // Payment will be handled later when Payfast is configured
    const bookingData = {
      origin_place_id: validatedData.origin.placeId,
      origin_address: validatedData.origin.formattedAddress,
      origin_name: validatedData.origin.name,
      origin_latitude: validatedData.origin.latitude,
      origin_longitude: validatedData.origin.longitude,
      destination_place_id: validatedData.destination.placeId,
      destination_address: validatedData.destination.formattedAddress,
      destination_name: validatedData.destination.name,
      destination_latitude: validatedData.destination.latitude,
      destination_longitude: validatedData.destination.longitude,
      pickup_datetime: validatedData.date.toISOString(), // Required by PayloadCMS
      trip_date: validatedData.date.toISOString(), // For compatibility
      passenger_count: validatedData.passengers,
      flight_number: validatedData.flightNumber,
      vehicle_id: validatedData.selectedVehicleId,
      total_amount: validatedData.quoteAmount,
      estimated_duration: validatedData.estimatedDuration,
      distance_km: validatedData.distance,
      customer_name: validatedData.customer.name,
      customer_email: validatedData.customer.email,
      customer_phone: validatedData.customer.phone,
      status: 'pending',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Generate booking reference ID (used as payment_reference)
    // Format: VST-{timestamp-based unique ID}
    const bookingReference = `VST-${Date.now().toString().slice(-8)}`;

    // Add payment_reference to booking data (this is the booking reference ID)
    bookingData.payment_reference = bookingReference;

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

    const bookingId = booking.id;
    const finalPaymentReference = booking.payment_reference || bookingReference;

    return {
      success: true,
      bookingId,
      bookingReference: finalPaymentReference,
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

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

