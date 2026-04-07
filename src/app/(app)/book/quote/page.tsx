'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingStore } from '@/features/booking/hooks/useBookingStore';
import { BookingWizardStepper } from '@/features/booking/components/BookingWizardStepper';
import { VehicleOptionCard, type VehicleOption } from '@/components/booking/VehicleOptionCard';
import { RouteSummaryCard } from '@/components/booking/RouteSummaryCard';
import { Button } from '@/components/ui/button';
import { StepTransition } from '@/components/booking/StepTransition';

export default function QuotePage() {
  const router = useRouter();
  const {
    origin,
    destination,
    date,
    passengers,
    quoteAmount,
    estimatedDuration,
    distance,
    selectedVehicleId,
    selectVehicle,
    vehicleOptions: storeVehicleOptions,
    bookingIntent,
    hourlyBillableHours,
  } = useBookingStore();

  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Route protection and load vehicle options
  useEffect(() => {
    console.log('[Quote Page] Effect running:', {
      hasOrigin: !!origin,
      hasDestination: !!destination,
      hasDate: !!date,
      hasVehicleOptions: !!storeVehicleOptions,
      vehicleOptionsCount: storeVehicleOptions?.length || 0,
      hasQuoteAmount: !!quoteAmount,
    });

    // Check if required data is missing
    if (
      !origin ||
      (bookingIntent !== 'hourly_hire' &&
        bookingIntent !== 'experience_package' &&
        !destination)
    ) {
      console.log('[Quote Page] Missing origin or destination, redirecting to search');
      router.push('/book/search');
      return;
    }

    // Load vehicle options from the store (set by BookingSearchForm after calculateQuote)
    if (storeVehicleOptions && storeVehicleOptions.length > 0) {
      // Map store vehicle options to VehicleOption format
      const mappedOptions: VehicleOption[] = storeVehicleOptions.map((vo) => ({
        id: vo.id,
        name: vo.name,
        passengerCapacity: vo.capacity,
        luggageCapacity: vo.luggageCapacity || 'Standard luggage',
        price: vo.price,
        imageUrl: vo.imageUrl,
      }));
      setVehicleOptions(mappedOptions);
      setIsLoading(false);
      console.log('[Quote Page] Loaded vehicle options:', mappedOptions.length, mappedOptions);
    } else if (storeVehicleOptions === null) {
      // If vehicle options is explicitly null (not loaded yet)
      // If we have quote amount, something went wrong - redirect
      if (quoteAmount) {
        console.warn('[Quote Page] Quote amount exists but vehicle options is null, redirecting to search');
        router.push('/book/search');
      } else {
        // No quote amount either - definitely need to go back to search
        console.warn('[Quote Page] No vehicle options or quote amount, redirecting to search');
        router.push('/book/search');
      }
    } else if (storeVehicleOptions && storeVehicleOptions.length === 0) {
      // Vehicle options is an empty array - no vehicles available
      setVehicleOptions([]);
      setIsLoading(false);
      console.warn('[Quote Page] Vehicle options is empty array');
    }
  }, [
    origin,
    destination,
    date,
    storeVehicleOptions,
    quoteAmount,
    router,
    bookingIntent,
  ]);

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicleOptions.find((v) => v.id === vehicleId);
    if (vehicle) {
      selectVehicle(vehicleId, vehicle.price);
    }
  };

  const handleContinue = () => {
    if (selectedVehicleId) {
      router.push('/book/details');
    }
  };

  const handleBack = () => {
    router.push('/book/search');
  };

  // Show loading state only if we're still loading or missing critical data
  const destinationLabel =
    destination?.formattedAddress ??
    (bookingIntent === 'hourly_hire'
      ? 'As directed (hourly chauffeur hire)'
      : bookingIntent === 'experience_package'
        ? 'Experience area (see itinerary)'
        : '');

  if (
    isLoading ||
    !origin ||
    (bookingIntent !== 'hourly_hire' &&
      bookingIntent !== 'experience_package' &&
      !destination) ||
    vehicleOptions.length === 0
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25A89B] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading quote...</p>
          {!origin ||
          (bookingIntent !== 'hourly_hire' &&
            bookingIntent !== 'experience_package' &&
            !destination) ? (
            <p className="mt-2 text-sm text-slate-500">Redirecting to search...</p>
          ) : vehicleOptions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Loading vehicle options...</p>
          ) : null}
        </div>
      </div>
    );
  }

  const formatTime = (date: Date | null) => {
    if (!date) return '00:00';
    // Ensure we're working with a proper Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    // Check if time is midnight (00:00) - might indicate time wasn't set
    if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
      // If it's midnight, check if we have a time in the store or use default
      return '08:00'; // Default fallback
    }
    return new Intl.DateTimeFormat('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dateObj);
  };

  return (
    <StepTransition>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <BookingWizardStepper currentStep="quote" className="mb-8" />

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Review Your Quote
              </h1>
              <p className="text-slate-600">
                Select your preferred vehicle option to continue
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    Available Vehicles
                  </h2>
                  {vehicleOptions.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800">
                        No vehicles available. Please go back and try again.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {vehicleOptions.map((vehicle) => (
                        <VehicleOptionCard
                          key={vehicle.id}
                          vehicle={vehicle}
                          isSelected={selectedVehicleId === vehicle.id}
                          onSelect={handleVehicleSelect}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {bookingIntent === 'hourly_hire' && hourlyBillableHours != null && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-600">Hourly hire</p>
                    <p className="font-semibold text-slate-900">
                      Billable hours (incl. minimum): {hourlyBillableHours}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Premium dedicated chauffeur — final quote is confirmed at checkout.
                    </p>
                  </div>
                )}
                {bookingIntent === 'experience_package' && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-600">Tour / experience package</p>
                    <p className="font-semibold text-slate-900">
                      Fixed package pricing (no route-based estimate)
                    </p>
                    {estimatedDuration != null ? (
                      <p className="text-xs text-slate-500 mt-1">
                        Typical day duration: about {Math.round(estimatedDuration)} minutes on
                        the road and at stops.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">
                        Total is reconciled again at checkout.
                      </p>
                    )}
                  </div>
                )}
                {bookingIntent !== 'hourly_hire' &&
                  bookingIntent !== 'experience_package' &&
                  estimatedDuration &&
                  distance && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Estimated trip duration</span>
                        <p className="font-semibold text-slate-900">
                          {Math.round(estimatedDuration)} minutes
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-600">Distance</span>
                        <p className="font-semibold text-slate-900">
                          {distance.toFixed(1)} km
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <RouteSummaryCard
                  origin={origin.formattedAddress}
                  destination={destinationLabel}
                  date={date || new Date()}
                  time={formatTime(date)}
                  passengerCount={passengers}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6 border-t border-slate-200">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!selectedVehicleId}
                className="min-w-[120px]"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </StepTransition>
  );
}

