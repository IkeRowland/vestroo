'use server';

import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Search booking by reservation number and phone
 */
const searchBookingSchema = z.object({
  reservationNumber: z.string().min(1, 'Reservation number is required'),
  countryCode: z.string().min(1, 'Country code is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
});

export type SearchBookingParams = z.infer<typeof searchBookingSchema>;

export interface BookingSearchResult {
  id: string;
  reservationNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  origin: string;
  destination: string;
  pickupDateTime: Date;
  passengerCount: number;
  vehicleId: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
}

export async function searchBooking(
  params: SearchBookingParams
): Promise<{ success: true; data: BookingSearchResult } | { success: false; error: string }> {
  try {
    const validatedParams = searchBookingSchema.parse(params);

    const supabase = await createServerClient();

    // Search for booking by payment_reference (reservation number) and customer phone
    // Remove spaces and format phone number for comparison
    const phoneNumberClean = validatedParams.phoneNumber.replace(/\s+/g, '');
    const countryCodeClean = validatedParams.countryCode.replace(/\s+/g, '');

    const { data: bookings, error: searchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('payment_reference', validatedParams.reservationNumber)
      .limit(1);

    if (searchError) {
      console.error('Error searching booking:', searchError);
      return {
        success: false,
        error: 'An error occurred while searching for your booking. Please try again.',
      };
    }

    if (!bookings || bookings.length === 0) {
      return {
        success: false,
        error: 'No booking found with the provided reservation number. Please check your reservation number and try again.',
      };
    }

    // Filter by phone number (check if phone matches with or without country code)
    const booking = bookings.find((b) => {
      const bookingPhone = b.customer_phone?.replace(/\s+/g, '') || '';
      return (
        bookingPhone === phoneNumberClean ||
        bookingPhone === `${countryCodeClean}${phoneNumberClean}` ||
        bookingPhone.endsWith(phoneNumberClean)
      );
    });

    if (!booking) {
      return {
        success: false,
        error: 'No booking found with the provided reservation number and phone number. Please check your details and try again.',
      };
    }

    // Format the result
    const result: BookingSearchResult = {
      id: booking.id,
      reservationNumber: booking.payment_reference || booking.id,
      customerName: booking.customer_name || 'N/A',
      customerEmail: booking.customer_email || 'N/A',
      customerPhone: booking.customer_phone || 'N/A',
      origin: booking.origin_name || 'N/A',
      destination: booking.destination_name || 'N/A',
      pickupDateTime: new Date(booking.trip_date),
      passengerCount: booking.passenger_count || 1,
      vehicleId: booking.vehicle_id || 'N/A',
      totalAmount: booking.total_amount || 0,
      status: booking.status || 'pending',
      paymentStatus: booking.payment_status || 'pending',
    };

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error searching booking:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Invalid input',
      };
    }
    return {
      success: false,
      error: 'An error occurred while searching for your booking. Please try again.',
    };
  }
}

