import type { Metadata } from 'next';

import { TripRequestBookingShell } from '@/features/booking/components/TripRequestBookingShell';
import { getTripRequestPhoneCountryIso2FromHeaders } from '@/lib/trip-request-phone-country-hint.server';

export const metadata: Metadata = {
  title: 'Request a trip | Vestroo',
  description:
    'Complete your shuttle trip request: trip details, vehicle, passenger contact, then confirmation — one page.',
};

/**
 * FE.10.1 / FE.19.1 — Trip request funnel: four in-shell slides (trip → vehicle → passenger → confirmation)
 * on one URL; ride details may come from session prefill or be edited on slide 1.
 * FE.19.2 — server-derived phone-country hint from headers.
 */
export default async function TripRequestPage() {
  const phoneCountryIso2Hint = await getTripRequestPhoneCountryIso2FromHeaders();
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center">
        <TripRequestBookingShell phoneCountryIso2Hint={phoneCountryIso2Hint} />
      </div>
    </div>
  );
}
