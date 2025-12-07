import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyPayFastWebhookSignature } from '@/lib/payfast';
import { sendBookingConfirmation, BookingEmailData } from '@/services/email';

/**
 * PayFast webhook handler
 * Handles payment confirmation callbacks from PayFast
 */
export async function POST(request: NextRequest) {
  try {
    // Get PayFast passphrase
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    if (!passphrase) {
      console.error('PAYFAST_PASSPHRASE not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Parse webhook data
    const formData = await request.formData();
    const webhookData: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      webhookData[key] = value.toString();
    });

    // Verify webhook signature
    const signature = webhookData.signature;
    if (!signature) {
      console.error('Missing signature in webhook payload');
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    const isValid = verifyPayFastWebhookSignature(webhookData, signature, passphrase);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Extract payment information
    const paymentStatus = webhookData.payment_status;
    const bookingId = webhookData.m_payment_id;
    const transactionId = webhookData.pf_payment_id;
    const amount = parseFloat(webhookData.amount_gross || '0');

    if (!bookingId) {
      console.error('Missing booking ID in webhook payload');
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = await createServerClient();

    // Check if booking exists and get current status (for idempotency)
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, payment_status')
      .eq('id', bookingId)
      .single();

    if (fetchError || !existingBooking) {
      console.error('Booking not found:', bookingId);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Handle idempotency: if already paid, return success without updating
    if (existingBooking.payment_status === 'paid' && paymentStatus === 'COMPLETE') {
      return NextResponse.json({ status: 'ok', message: 'Already processed' });
    }

    // Update booking based on payment status
    const updateData: Record<string, unknown> = {
      payment_reference: transactionId || null,
      transaction_id: transactionId || null,
      payment_timestamp: paymentStatus === 'COMPLETE' ? new Date().toISOString() : null,
    };

    if (paymentStatus === 'COMPLETE') {
      // Payment successful
      updateData.payment_status = 'paid';
      updateData.status = 'paid';
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
      // Payment failed or cancelled
      updateData.payment_status = 'failed';
      updateData.status = 'pending'; // Keep booking as pending for retry
    } else {
      // Other statuses (e.g., PENDING, PROCESSING)
      updateData.payment_status = 'pending';
    }

    // Update booking in Supabase
    const { error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }

    // Send confirmation email if payment was successful
    if (paymentStatus === 'COMPLETE') {
      try {
        // Fetch complete booking details for email
        const { data: booking, error: bookingFetchError } = await supabase
          .from('bookings')
          .select(
            'id, customer_name, customer_email, origin_name, destination_name, trip_date, passenger_count, flight_number, total_amount, payment_reference, transaction_id, payment_status'
          )
          .eq('id', bookingId)
          .single();

        if (bookingFetchError || !booking) {
          console.error(
            `[Webhook] Failed to fetch booking details for email: ${bookingId}`,
            bookingFetchError
          );
          // Don't fail webhook - booking is already updated
        } else if (booking.payment_status === 'paid' && booking.customer_email) {
          // Validate booking has 'paid' status and valid email before sending
          const emailData: BookingEmailData = {
            bookingId: booking.id,
            customerName: booking.customer_name || 'Valued Customer',
            customerEmail: booking.customer_email,
            origin: booking.origin_name || 'Origin',
            destination: booking.destination_name || 'Destination',
            pickupDateTime: new Date(booking.trip_date),
            passengerCount: booking.passenger_count || 1,
            flightNumber: booking.flight_number,
            totalAmount: booking.total_amount || 0,
            paymentReference: booking.payment_reference || transactionId || 'N/A',
            transactionId: booking.transaction_id || transactionId || null,
          };

          // Send confirmation email (non-blocking)
          const emailResult = await sendBookingConfirmation(emailData);

          if (emailResult.success) {
            console.log(
              `[Webhook] Confirmation email sent successfully for booking ${bookingId}. Message ID: ${emailResult.messageId}`
            );
          } else {
            console.error(
              `[Webhook] Failed to send confirmation email for booking ${bookingId}:`,
              emailResult.error
            );
            // Don't throw - email failure shouldn't fail webhook
          }
        } else {
          console.warn(
            `[Webhook] Skipping email for booking ${bookingId}: payment_status=${booking?.payment_status}, email=${booking?.customer_email ? 'present' : 'missing'}`
          );
        }
      } catch (emailError) {
        // Log error but don't fail webhook
        console.error(
          `[Webhook] Error sending confirmation email for booking ${bookingId}:`,
          emailError
        );
      }
    }

    // Return success to PayFast
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing PayFast webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

