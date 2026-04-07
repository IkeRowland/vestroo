import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyPayFastWebhookSignature } from '@/lib/payfast';
import { sendBookingConfirmation, BookingEmailData } from '@/services/email';

/**
 * PayFast ITN / webhook handler — signature verification, idempotent COMPLETE handling,
 * no duplicate confirmation emails on provider retries (see docs/integrations-and-payments.md).
 */
export async function POST(request: NextRequest) {
  try {
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    if (!passphrase) {
      console.error('PAYFAST_PASSPHRASE not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const formData = await request.formData();
    const webhookData: Record<string, string> = {};

    formData.forEach((value, key) => {
      webhookData[key] = value.toString();
    });

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

    const paymentStatus = webhookData.payment_status;
    const bookingId = webhookData.m_payment_id;
    const transactionId = webhookData.pf_payment_id || '';

    if (!bookingId) {
      console.error('Missing booking ID in webhook payload');
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    const supabase = await createServerClient();

    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, payment_status, trans_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !existingBooking) {
      console.error('Booking not found:', bookingId);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (paymentStatus === 'COMPLETE') {
      if (existingBooking.payment_status === 'paid') {
        return NextResponse.json({
          status: 'ok',
          message: 'Already processed',
        });
      }

      const updateData = {
        trans_id: transactionId || null,
        payment_timestamp: new Date().toISOString(),
        payment_status: 'paid' as const,
        status: 'paid' as const,
      };

      const { data: transitioned, error: transitionError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)
        .neq('payment_status', 'paid')
        .select(
          'id, customer_name, customer_email, origin_name, destination_name, trip_date, passenger_count, flight_number, total_amount, payment_reference, trans_id, payment_status'
        )
        .maybeSingle();

      if (transitionError) {
        console.error('Error updating booking:', transitionError);
        return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
      }

      if (!transitioned) {
        const { data: afterRace } = await supabase
          .from('bookings')
          .select('payment_status')
          .eq('id', bookingId)
          .single();
        if (afterRace?.payment_status === 'paid') {
          return NextResponse.json({
            status: 'ok',
            message: 'Already processed',
          });
        }
        console.error('[Webhook] COMPLETE did not transition booking', bookingId);
        return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
      }

      if (transitioned.customer_email) {
        try {
          const emailData: BookingEmailData = {
            bookingId: transitioned.id,
            customerName: transitioned.customer_name || 'Valued Customer',
            customerEmail: transitioned.customer_email,
            origin: transitioned.origin_name || 'Origin',
            destination: transitioned.destination_name || 'Destination',
            pickupDateTime: new Date(transitioned.trip_date),
            passengerCount: transitioned.passenger_count || 1,
            flightNumber: transitioned.flight_number,
            totalAmount: transitioned.total_amount || 0,
            paymentReference:
              transitioned.payment_reference || transactionId || 'N/A',
            transactionId: transitioned.trans_id || transactionId || null,
          };
          const emailResult = await sendBookingConfirmation(emailData);
          if (emailResult.success) {
            console.log(
              `[Webhook] Confirmation email sent for booking ${bookingId}. Message ID: ${emailResult.messageId}`
            );
          } else {
            console.error(
              `[Webhook] Failed to send confirmation email for booking ${bookingId}:`,
              emailResult.error
            );
          }
        } catch (emailError) {
          console.error(
            `[Webhook] Error sending confirmation email for booking ${bookingId}:`,
            emailError
          );
        }
      } else {
        console.warn(
          `[Webhook] Skipping email for booking ${bookingId}: missing customer_email`
        );
      }

      return NextResponse.json({ status: 'ok' });
    }

    if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
      if (existingBooking.payment_status === 'paid') {
        return NextResponse.json({
          status: 'ok',
          message: 'Ignored: booking already paid',
        });
      }

      const failUpdate = {
        trans_id: transactionId || null,
        payment_timestamp: null,
        payment_status: 'failed' as const,
        status: 'pending' as const,
      };

      const { error: failErr } = await supabase
        .from('bookings')
        .update(failUpdate)
        .eq('id', bookingId)
        .neq('payment_status', 'paid');

      if (failErr) {
        console.error('Error updating failed booking:', failErr);
        return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
      }

      return NextResponse.json({ status: 'ok' });
    }

    const pendingUpdate: Record<string, unknown> = {
      trans_id: transactionId || null,
      payment_timestamp: null,
      payment_status: 'pending',
    };

    const { error: pendingErr } = await supabase
      .from('bookings')
      .update(pendingUpdate)
      .eq('id', bookingId)
      .neq('payment_status', 'paid');

    if (pendingErr) {
      console.error('Error updating booking:', pendingErr);
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing PayFast webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
