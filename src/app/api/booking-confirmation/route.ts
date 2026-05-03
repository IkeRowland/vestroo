import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Public read of a single booking for the confirmation page after the customer submits the
 * booking flow (Epic 16 / Theme N — EFT instructions emailed; no provider redirect).
 * UUID acts as an unguessable capability; no PII beyond what the traveller already provided.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !uuidRe.test(id)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('bookings')
      .select(
        `id, payment_status, payment_reference, trans_id, origin_address, destination_address,
         origin_name, destination_name, pickup_datetime, trip_date, passenger_count,
         flight_number, total_amount, vehicle_id, customer_name, customer_email, customer_phone,
         booking_intent, hourly_duration_hours`
      )
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      reservationReference: data.payment_reference,
      paymentStatus: data.payment_status,
      gatewayTransactionId: data.trans_id,
      originLabel: data.origin_name || data.origin_address,
      destinationLabel: data.destination_name || data.destination_address,
      pickupDateTime: data.pickup_datetime || data.trip_date,
      passengerCount: data.passenger_count,
      flightNumber: data.flight_number,
      totalAmount: data.total_amount,
      vehicleId: data.vehicle_id,
      customerName: data.customer_name,
      customerEmail: data.customer_email,
      customerPhone: data.customer_phone,
      bookingIntent: data.booking_intent,
      hourlyDurationHours: data.hourly_duration_hours,
    });
  } catch (e) {
    console.error('booking-confirmation GET:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
