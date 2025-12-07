'use server';

import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { generatePayFastSignature, getPayFastUrl, PayFastPaymentParams } from '@/lib/payfast';

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
 * Process payment and create booking
 * Returns booking ID and PayFast payment parameters
 */
export async function processPayment(bookingState: unknown) {
  try {
    // Validate input data
    const validatedData = bookingStateSchema.parse(bookingState);

    // Validate amount matches quote
    if (validatedData.quoteAmount <= 0) {
      return {
        success: false,
        error: 'Invalid payment amount',
      };
    }

    // Create Supabase client
    const supabase = await createServerClient();

    // Create booking record in Supabase with status 'pending'
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
      trip_date: validatedData.date.toISOString(),
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

    // Get PayFast configuration
    const merchantId = process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    if (!merchantId || !merchantKey || !passphrase) {
      console.error('Missing PayFast configuration');
      return {
        success: false,
        error: 'Payment configuration error. Please contact support.',
      };
    }

    // Prepare PayFast payment parameters
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const payfastParams: Omit<PayFastPaymentParams, 'signature'> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${baseUrl}/confirmation?bookingId=${bookingId}`,
      cancel_url: `${baseUrl}/book/payment?error=cancelled`,
      notify_url: `${baseUrl}/api/payfast/webhook`,
      name_first: validatedData.customer.name.split(' ')[0] || validatedData.customer.name,
      name_last: validatedData.customer.name.split(' ').slice(1).join(' ') || '',
      email_address: validatedData.customer.email,
      cell_number: validatedData.customer.phone,
      m_payment_id: bookingId,
      amount: validatedData.quoteAmount.toFixed(2),
      item_name: `Vestroo Booking - ${validatedData.origin.name} to ${validatedData.destination.name}`,
    };

    // Generate PayFast signature
    const signature = generatePayFastSignature(payfastParams, passphrase);

    const payfastData: PayFastPaymentParams = {
      ...payfastParams,
      signature,
    };

    return {
      success: true,
      bookingId,
      payfastData,
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

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

