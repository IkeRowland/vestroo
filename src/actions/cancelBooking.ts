'use server';

import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const cancelSchema = z.object({
  bookingId: z.string().uuid(),
  countryCode: z.string().min(1),
  phoneNumber: z.string().min(1),
});

/**
 * Guest cancellation: verifies phone matches booking, sets status cancelled.
 * Uses service role (same as other booking actions).
 */
export async function cancelBooking(input: unknown): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  try {
    const params = cancelSchema.parse(input);
    const supabase = await createServerClient();

    const phoneClean = params.phoneNumber.replace(/\s+/g, '');
    const ccClean = params.countryCode.replace(/\s+/g, '');

    const { data: row, error: fetchError } = await supabase
      .from('bookings')
      .select('id, customer_phone, status, payment_status')
      .eq('id', params.bookingId)
      .maybeSingle();

    if (fetchError || !row) {
      return { success: false, error: 'Booking not found.' };
    }

    if (row.status === 'cancelled') {
      return { success: true };
    }

    if (row.payment_status === 'paid') {
      return {
        success: false,
        error:
          'This booking is already paid. Please contact us to change or cancel.',
      };
    }

    const bookingPhone = row.customer_phone?.replace(/\s+/g, '') || '';
    const phoneOk =
      bookingPhone === phoneClean ||
      bookingPhone === `${ccClean}${phoneClean}` ||
      bookingPhone.endsWith(phoneClean);

    if (!phoneOk) {
      return {
        success: false,
        error: 'Phone number does not match this booking.',
      };
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
      })
      .eq('id', params.bookingId);

    if (updateError) {
      console.error('cancelBooking update:', updateError);
      return { success: false, error: 'Unable to cancel booking. Try again.' };
    }

    return { success: true };
  } catch (e) {
    console.error('cancelBooking:', e);
    if (e instanceof z.ZodError) {
      return { success: false, error: 'Invalid request.' };
    }
    return { success: false, error: 'Unable to cancel booking.' };
  }
}
