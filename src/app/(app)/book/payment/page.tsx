'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingStore } from '@/features/booking/hooks/useBookingStore';
import { BookingWizardStepper } from '@/features/booking/components/BookingWizardStepper';
import { PaymentSummaryCard } from '@/components/booking/PaymentSummaryCard';
import { Button } from '@/components/ui/button';
import { StepTransition } from '@/components/booking/StepTransition';
import { createBooking } from '@/actions/createBooking';
import { Alert, AlertDescription } from '@/components/ui/alert';

function PaymentPageInner() {
  const router = useRouter();
  const {
    origin,
    destination,
    date,
    passengers,
    selectedVehicleId,
    quoteAmount,
    customer,
    riderContact,
    flightNumber,
    estimatedDuration,
    distance,
    vehicleOptions,
    bookingIntent,
    hourlyDurationHours,
    hourlyServiceAreaNotes,
    experiencePackageId,
    experienceAddonIds,
    clientTypeResolution,
    purchaseOrderRef,
    setBookingId,
    setPaymentStatus,
  } = useBookingStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleConfirm = async () => {
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
        rider:
          riderContact && (riderContact.name.trim() || riderContact.email.trim() || riderContact.phone.trim())
            ? {
                name: riderContact.name.trim() || undefined,
                email: riderContact.email.trim() || undefined,
                phone: riderContact.phone.trim() || undefined,
              }
            : undefined,
        clientTypeResolution: clientTypeResolution ?? undefined,
        purchaseOrderRef: purchaseOrderRef.trim() || null,
      };

      const result = await createBooking(bookingState);

      if (!result.success || !result.bookingId) {
        setError(result.error || 'Failed to create booking. Please try again.');
        setPaymentStatus('failed');
        setIsProcessing(false);
        return;
      }

      setBookingId(result.bookingId);
      setPaymentStatus('pending');
      router.push(`/confirmation?id=${result.bookingId}`);
    } catch (err) {
      console.error('Booking error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Booking submission failed. Please try again.';
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
                Confirm booking
              </h1>
              <p className="text-slate-600">
                Review your booking details. Payment instructions will be emailed to you after we
                receive your booking.
              </p>
            </div>

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
                      : 'As directed (hourly driver hire)')
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
                        Payment instructions are emailed once your booking is recorded.
                      </p>
                      <p className="text-xs text-slate-500">
                        You will not be charged on this page.
                      </p>
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
                onClick={handleConfirm}
                disabled={isProcessing}
                className="min-w-[160px] bg-[#25A89B] hover:bg-[#1f8f83]"
              >
                {isProcessing ? 'Submitting...' : 'Confirm booking'}
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
