'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/features/booking/hooks/useBookingStore';
import { BookingWizardStepper } from '@/features/booking/components/BookingWizardStepper';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { Button } from '@/components/ui/button';
import { StepTransition } from '@/components/booking/StepTransition';
import { Card, CardContent } from '@/components/ui/card';
import { createClientClient } from '@/lib/supabase/client';

function ConfirmationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');

  const {
    origin,
    destination,
    date,
    passengers,
    selectedVehicleId,
    quoteAmount,
    customer,
    flightNumber,
  } = useBookingStore();

  const [bookingReference, setBookingReference] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch booking details from Supabase
  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        // Generate a temporary booking reference if no booking ID
        const tempRef = `VST-${Date.now().toString().slice(-8)}`;
        setBookingReference(tempRef);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClientClient();
        const { data: booking, error } = await supabase
          .from('bookings')
          .select('id, payment_status, payment_reference, transaction_id')
          .eq('id', bookingId)
          .single();

        if (error || !booking) {
          console.error('Error fetching booking:', error);
          setBookingReference(bookingId);
          setIsLoading(false);
          return;
        }

        setBookingReference(booking.id);
        setPaymentStatus(booking.payment_status || 'pending');
        setPaymentReference(booking.payment_reference || booking.transaction_id || '');
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching booking details:', error);
        setBookingReference(bookingId);
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  const handleViewBooking = () => {
    // Placeholder: Will link to user profile in future
    alert('View booking details feature will be available in user profile.');
  };

  const handleReturnHome = () => {
    router.push('/');
  };

  if (!customer || !selectedVehicleId || !origin || !destination || !date || !quoteAmount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">No booking data available.</p>
          <Button onClick={handleReturnHome} className="mt-4">
            Return to Homepage
          </Button>
        </div>
      </div>
    );
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  // Get vehicle name (temporary - will be from database in Epic 2)
  const vehicleName = selectedVehicleId === 'sedan' ? 'Premium Sedan' : 'Luxury Van';
  const vehicleCapacity = selectedVehicleId === 'sedan' ? 4 : 8;

  return (
    <StepTransition>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <BookingWizardStepper currentStep="confirmation" className="mb-8" />

          <div className="space-y-6">
            {/* Success Message */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-green-900 mb-2">
                      Booking Confirmed!
                    </h2>
                    <p className="text-green-700">
                      Your booking has been received. We&apos;ll send you a confirmation email shortly.
                    </p>
                    <div className="mt-4">
                      <p className="text-sm text-green-600">Booking Reference</p>
                      <p className="text-lg font-bold text-green-900">{bookingReference}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Summary */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Booking Details</h2>
              <BookingSummary
                origin={origin.formattedAddress}
                destination={destination.formattedAddress}
                date={date}
                time={formatTime(date)}
                passengerCount={passengers}
                vehicleName={vehicleName}
                vehicleCapacity={vehicleCapacity}
                customerName={customer.name}
                customerEmail={customer.email}
                customerPhone={customer.phone}
                flightNumber={flightNumber}
                finalPrice={quoteAmount}
              />
            </div>

            {/* Payment Status */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-600">Payment Status</p>
                    <p
                      className={`text-lg font-semibold mt-1 ${
                        paymentStatus === 'paid'
                          ? 'text-green-600'
                          : paymentStatus === 'failed'
                          ? 'text-red-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {paymentStatus === 'paid'
                        ? 'Payment Confirmed'
                        : paymentStatus === 'failed'
                        ? 'Payment Failed'
                        : 'Payment Pending'}
                    </p>
                    {paymentReference && (
                      <p className="text-xs text-slate-500 mt-1">
                        Reference: {paymentReference}
                      </p>
                    )}
                    {paymentStatus === 'pending' && (
                      <p className="text-xs text-slate-500 mt-1">
                        Your payment is being processed. You will receive a confirmation email once completed.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button variant="outline" onClick={handleViewBooking}>
                View Booking Details
              </Button>
              <Button onClick={handleReturnHome} className="bg-[#25A89B] hover:bg-[#1f8f83]">
                Return to Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>
    </StepTransition>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25A89B] mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading confirmation...</p>
          </div>
        </div>
      }
    >
      <ConfirmationPageContent />
    </Suspense>
  );
}

