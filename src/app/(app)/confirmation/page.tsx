'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/features/booking/hooks/useBookingStore';
import { BookingWizardStepper } from '@/features/booking/components/BookingWizardStepper';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { Button } from '@/components/ui/button';
import { StepTransition } from '@/components/booking/StepTransition';
import { Card, CardContent } from '@/components/ui/card';

type RemoteConfirmation = {
  reservationReference: string | null;
  paymentStatus: string | null;
  gatewayTransactionId: string | null;
  originLabel: string | null;
  destinationLabel: string | null;
  pickupDateTime: string | null;
  passengerCount: number | null;
  flightNumber: string | null;
  totalAmount: number | null;
  vehicleId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  bookingIntent: string | null;
  hourlyDurationHours: number | null;
};

function ConfirmationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id') || searchParams.get('bookingId');

  const store = useBookingStore();

  const [bookingReference, setBookingReference] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [gatewayRef, setGatewayRef] = useState<string>('');
  const [remote, setRemote] = useState<RemoteConfirmation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!bookingId) {
        setBookingReference(`VST-${Date.now().toString().slice(-8)}`);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/booking-confirmation?id=${bookingId}`);
        if (!res.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await res.json()) as RemoteConfirmation;
        if (cancelled) return;
        setRemote(data);
        setBookingReference(data.reservationReference || bookingId);
        setPaymentStatus(data.paymentStatus || 'pending');
        setGatewayRef(data.gatewayTransactionId || '');
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const handleReturnHome = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25A89B] mx-auto" />
          <p className="mt-4 text-slate-600">Loading confirmation...</p>
        </div>
      </div>
    );
  }

  if (bookingId && loadError && !remote) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-slate-600">
            We could not load this booking. Check your link or use booking search with your
            reservation number.
          </p>
          <Button onClick={() => router.push('/book/search')} className="mt-4">
            Booking search
          </Button>
        </div>
      </div>
    );
  }

  const useRemote = Boolean(remote);
  const originAddr =
    remote?.originLabel ||
    store.origin?.formattedAddress ||
    '';
  const destAddr =
    remote?.destinationLabel ||
    store.destination?.formattedAddress ||
    '';
  const tripDate = remote?.pickupDateTime
    ? new Date(remote.pickupDateTime)
    : store.date;
  const passengers =
    remote?.passengerCount ?? store.passengers;
  const customerName =
    remote?.customerName || store.customer?.name || '';
  const customerEmail =
    remote?.customerEmail || store.customer?.email || '';
  const customerPhone =
    remote?.customerPhone || store.customer?.phone || '';
  const flightNumber =
    remote?.flightNumber ?? store.flightNumber;
  const finalPrice =
    remote?.totalAmount ?? store.quoteAmount ?? 0;
  const vehicleId = remote?.vehicleId || store.selectedVehicleId || '';
  const vehicleName = vehicleId
    ? `Chauffeured vehicle (option ${vehicleId})`
    : 'Vehicle';
  const vehicleCapacity = 4;

  if (
    !originAddr ||
    !destAddr ||
    !tripDate ||
    !customerName ||
    !customerEmail ||
    !customerPhone
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-600">No booking data available.</p>
          <Button onClick={handleReturnHome} className="mt-4">
            Return to Homepage
          </Button>
        </div>
      </div>
    );
  }

  const formatTime = (d: Date) => {
    return new Intl.DateTimeFormat('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  };

  return (
    <StepTransition>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <BookingWizardStepper currentStep="confirmation" className="mb-8" />

          <div className="space-y-6">
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
                      {paymentStatus === 'paid'
                        ? 'Booking received — payment confirmed'
                        : 'Booking received'}
                    </h2>
                    <p className="text-green-700">
                      {paymentStatus === 'paid'
                        ? 'Thank you. A confirmation email is sent when payment completes.'
                        : 'If you just paid, confirmation may take a moment while we verify with PayFast.'}
                    </p>
                    <div className="mt-4">
                      <p className="text-sm text-green-600">Reservation reference</p>
                      <p className="text-lg font-bold text-green-900">{bookingReference}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Trip summary</h2>
              <BookingSummary
                origin={originAddr}
                destination={destAddr}
                date={tripDate}
                time={formatTime(tripDate)}
                passengerCount={passengers}
                vehicleName={vehicleName}
                vehicleCapacity={vehicleCapacity}
                customerName={customerName}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                flightNumber={flightNumber}
                finalPrice={finalPrice}
              />
            </div>

            {useRemote &&
              remote?.bookingIntent === 'hourly_hire' &&
              remote.hourlyDurationHours != null && (
                <p className="text-sm text-slate-600">
                  Hourly hire — requested duration recorded: {remote.hourlyDurationHours} h
                  (billable minimum may apply; see your quote).
                </p>
              )}

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-600">Payment status</p>
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
                        ? 'Paid'
                        : paymentStatus === 'failed'
                          ? 'Payment failed'
                          : 'Pending'}
                    </p>
                    {gatewayRef && (
                      <p className="text-xs text-slate-500 mt-1">
                        Payment gateway reference: {gatewayRef}
                      </p>
                    )}
                    {paymentStatus === 'pending' && (
                      <p className="text-xs text-slate-500 mt-1">
                        You will receive email confirmation once PayFast reports success.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25A89B] mx-auto" />
            <p className="mt-4 text-slate-600">Loading confirmation...</p>
          </div>
        </div>
      }
    >
      <ConfirmationPageContent />
    </Suspense>
  );
}
