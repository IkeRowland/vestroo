'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useBookingStore } from '@/features/booking/hooks/useBookingStore';

/**
 * Local-only: `?e2e_fixture=quote` seeds the booking store and navigates to `/book/quote`
 * so Playwright can exercise the quote step without live Maps or quote Server Actions.
 * Restricted to **localhost / 127.0.0.1** so production hosts are not affected even if the bundle is reused.
 */
export function E2eBookingFixtureLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const seededRef = useRef(false);

  const setTripDetails = useBookingStore((s) => s.setTripDetails);
  const setBookingProduct = useBookingStore((s) => s.setBookingProduct);
  const setQuoteDetails = useBookingStore((s) => s.setQuoteDetails);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return;
    }
    if (seededRef.current) {
      return;
    }
    const fixture = searchParams.get('e2e_fixture');
    if (fixture !== 'quote') {
      return;
    }
    seededRef.current = true;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    setTripDetails({
      origin: {
        placeId: 'e2e-origin',
        formattedAddress: 'E2E Pickup, Cape Town',
        name: 'E2E Pickup',
        latitude: -33.9249,
        longitude: 18.4241,
      },
      destination: null,
      date: tomorrow,
      passengers: 2,
    });
    setBookingProduct({
      bookingIntent: 'hourly_hire',
      hourlyDurationHours: 3,
      hourlyServiceAreaNotes: 'E2E fixture area',
      hourlyBillableHours: 3,
    });
    setQuoteDetails({
      vehicleOptions: [
        {
          id: 'e2e-sedan',
          name: 'Executive Sedan (E2E)',
          capacity: 4,
          price: 1500,
          luggageCapacity: '2 bags',
        },
      ],
      quoteAmount: null,
      estimatedDuration: null,
      distance: null,
    });

    router.replace('/book/quote');
  }, [searchParams, router, setTripDetails, setBookingProduct, setQuoteDetails]);

  return null;
}
