'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingStore } from '@/features/booking/hooks/useBookingStore';
import { BookingWizardStepper } from '@/features/booking/components/BookingWizardStepper';
import {
  ContactDetailsForm,
  type ContactDetailsFormData,
} from '@/features/booking/components/ContactDetailsForm';
import { Button } from '@/components/ui/button';
import { StepTransition } from '@/components/booking/StepTransition';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ContactDetailsPage() {
  const router = useRouter();
  const {
    selectedVehicleId,
    origin,
    destination,
    date,
    quoteAmount,
    bookingIntent,
    setCustomerDetails,
    setRiderContact,
    setPurchaseOrderRef,
  } = useBookingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedVehicleId) {
      router.push('/book/quote');
    }
  }, [selectedVehicleId, router]);

  const handleFormSubmit = async (data: ContactDetailsFormData) => {
    const needsDestination =
      bookingIntent !== 'hourly_hire' && bookingIntent !== 'experience_package';
    if (
      !origin ||
      (needsDestination && !destination) ||
      !date ||
      !quoteAmount ||
      !selectedVehicleId
    ) {
      setError('Missing required booking information. Please go back and complete all steps.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      setCustomerDetails({
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
      const rn = (data.riderName ?? '').trim();
      const re = (data.riderEmail ?? '').trim();
      const rp = (data.riderPhone ?? '').trim();
      setRiderContact(rn || re || rp ? { name: rn, email: re, phone: rp } : null);
      setPurchaseOrderRef((data.purchaseOrderRef ?? '').trim());

      router.push('/book/payment');
    } catch (err) {
      console.error('Error saving details:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push('/book/quote');
  };

  if (!selectedVehicleId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25A89B] mx-auto"></div>
          <p className="mt-4 text-slate-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  const showFlightNumber = origin?.isAirport === true;

  return (
    <StepTransition>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <BookingWizardStepper currentStep="details" className="mb-8" />

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Trip details &amp; contact
              </h1>
              <p className="text-slate-600">
                Next you&apos;ll review the total and pay securely. Your quote is re-checked on our
                servers before payment.
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8">
              <ContactDetailsForm
                onSubmit={handleFormSubmit}
                showFlightNumber={showFlightNumber}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6 border-t border-slate-200">
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Back
              </Button>
              <Button
                onClick={() => {
                  const form = document.querySelector('form');
                  if (form) {
                    form.requestSubmit();
                  }
                }}
                disabled={isSubmitting}
                className="min-w-[160px] bg-[#25A89B] hover:bg-[#1f8f83]"
              >
                {isSubmitting ? 'Saving...' : 'Continue to payment'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </StepTransition>
  );
}
