'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/features/booking/hooks/useBookingStore';
import { BookingWizardStepper } from '@/features/booking/components/BookingWizardStepper';
import { PaymentSummaryCard } from '@/components/booking/PaymentSummaryCard';
import { Button } from '@/components/ui/button';
import { StepTransition } from '@/components/booking/StepTransition';
import { processPayment } from '@/actions/processPayment';
import { initializePayFastModal } from '@/lib/payfast-client';
import { Alert, AlertDescription } from '@/components/ui/alert';

function PaymentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const payfastCancelled = searchParams.get('error') === 'cancelled';
  const {
    origin,
    destination,
    date,
    passengers,
    selectedVehicleId,
    quoteAmount,
    customer,
    flightNumber,
    estimatedDuration,
    distance,
    vehicleOptions,
    bookingIntent,
    hourlyDurationHours,
    hourlyServiceAreaNotes,
    experiencePackageId,
    experienceAddonIds,
    setBookingId,
    setPaymentStatus,
  } = useBookingStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Route protection: redirect if customer details missing
  useEffect(() => {
    if (!customer) {
      router.push('/book/details');
      return;
    }
    if (!selectedVehicleId) {
      router.push('/book/quote');
      return;
    }
  }, [customer, selectedVehicleId, router]);

  const hasRequiredTrip =
    origin &&
    date &&
    quoteAmount &&
    selectedVehicleId &&
    (bookingIntent === 'hourly_hire' ||
      bookingIntent === 'experience_package' ||
      destination);

  const handleBack = () => {
    router.push('/book/details');
  };

  const handlePayment = async () => {
    if (!origin || !date || !quoteAmount || !customer || !selectedVehicleId) {
      setError('Missing required booking information. Please go back and complete all steps.');
      return;
    }
    if (
      bookingIntent !== 'hourly_hire' &&
      bookingIntent !== 'experience_package' &&
      !destination
    ) {
      setError('Missing drop-off. Please go back to search.');
      return;
    }
    if (
      bookingIntent === 'experience_package' &&
      (!experiencePackageId || !date)
    ) {
      setError('Missing experience package details. Please start again from the tour page.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPaymentStatus('processing');

    try {
      // Prepare booking state for server action
      const bookingState = {
        bookingIntent,
        origin,
        destination: destination ?? null,
        date,
        passengers,
        flightNumber,
        selectedVehicleId,
        quoteAmount,
        estimatedDuration,
        distance,
        hourlyDurationHours,
        hourlyServiceAreaNotes,
        bookingMetadata:
          bookingIntent === 'experience_package' && experiencePackageId
            ? {
                experience_package_id: experiencePackageId,
                experience_date: date.toISOString(),
                group_size: passengers,
                selected_addon_ids: experienceAddonIds,
              }
            : undefined,
        customer,
      };

      // Call server action to create booking and get PayFast data
      const result = await processPayment(bookingState);

      if (
        !result.success ||
        !result.bookingId ||
        !result.payfastData ||
        !result.payfastProcessBaseUrl
      ) {
        setError(result.error || 'Failed to initialize payment. Please try again.');
        setPaymentStatus('failed');
        setIsProcessing(false);
        return;
      }

      // Store booking ID
      setBookingId(result.bookingId);

      // Initialize PayFast payment (form submission redirects to PayFast)
      // After payment, PayFast will redirect to return_url (confirmation page)
      await initializePayFastModal(
        result.payfastData,
        result.payfastProcessBaseUrl
      );
      
      // Note: Code after this point may not execute due to form submission navigation
      // PayFast will redirect user to return_url after payment completion
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Payment processing failed. Please try again.';
      setError(errorMessage);
      setPaymentStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!customer || !selectedVehicleId || !hasRequiredTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25A89B] mx-auto"></div>
          <p className="mt-4 text-slate-600">Redirecting...</p>
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

  // Get vehicle name from vehicle options stored in the booking store
  const selectedVehicle = vehicleOptions?.find((v) => v.id === selectedVehicleId);
  const vehicleName = selectedVehicle?.name || 'Vehicle';
  return (
    <StepTransition>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <BookingWizardStepper currentStep="payment" className="mb-8" />

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Payment
              </h1>
              <p className="text-slate-600">
                Review your booking details and proceed to payment
              </p>
            </div>

            {/* Error Message */}
            {payfastCancelled && (
              <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-950">
                <AlertDescription>
                  You left the PayFast checkout without paying. No charge was made. Tap{' '}
                  <strong>Pay securely</strong> to try again, or use{' '}
                  <strong>Manage booking</strong> with your reservation reference if you already
                  completed payment on a previous attempt.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PaymentSummaryCard
                  basePrice={quoteAmount}
                  fees={0}
                  total={quoteAmount}
                  origin={origin.formattedAddress}
                  destination={
                    destination?.formattedAddress ??
                    (bookingIntent === 'experience_package'
                      ? 'Experience package'
                      : 'As directed (hourly chauffeur hire)')
                  }
                  date={date}
                  time={formatTime(date)}
                  passengers={passengers}
                  vehicleName={vehicleName}
                />
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg border border-slate-200 p-6 sticky top-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-2">
                        Final Price
                      </h3>
                      <div className="text-4xl font-bold text-[#25A89B]">
                        R {quoteAmount.toFixed(2)}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-600 mb-2">
                        Secure payment powered by PayFast
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <span>256-bit SSL Encryption</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6 border-t border-slate-200">
              <Button variant="outline" onClick={handleBack} disabled={isProcessing}>
                Back
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="min-w-[160px] bg-[#25A89B] hover:bg-[#1f8f83]"
              >
                {isProcessing ? 'Processing...' : 'Pay securely'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </StepTransition>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center text-slate-600">Loading…</div>
        </div>
      }
    >
      <PaymentPageInner />
    </Suspense>
  );
}

