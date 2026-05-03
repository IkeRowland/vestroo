import { Suspense } from 'react';

import { BookingSearchForm } from '@/features/booking/components/BookingSearchForm';
import { E2eBookingFixtureLoader } from '@/features/booking/components/e2e-booking-fixture-loader';
import { loadBookAgainPortalBootstrap } from '@/lib/book-again-portal-handoff.server';
import { parseBookingSearchUrlParams } from '@/lib/booking-search-url-params';
import { getTripRequestPhoneCountryIso2FromHeaders } from '@/lib/trip-request-phone-country-hint.server';

/** Avoid stale SSR HTML after client-component markup changes (hydration vs old .next cache). */
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    tab?: string;
    /** Story **18.5** — pre-fills reservation / ref lookup in the modify tab. */
    modify?: string;
    originHint?: string;
    destinationHint?: string;
    passengers?: string;
    intent?: string;
    serviceTypeHint?: string;
    omitTripDate?: string;
  }>;
};

/**
 * Booking Search Page
 * `?tab=login` opens the modify / lookup flow (matches header "LOGIN").
 */
export default async function BookingSearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { initialTab, bookSearchPrefill, modifyPrefillRef } = parseBookingSearchUrlParams(sp);

  const portalRebookBootstrap = await loadBookAgainPortalBootstrap();
  const tripRequestPhoneCountryIso2Hint = await getTripRequestPhoneCountryIso2FromHeaders();

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center">
          <Suspense fallback={null}>
            <E2eBookingFixtureLoader />
          </Suspense>
          <BookingSearchForm
            initialTab={initialTab}
            bookSearchPrefill={bookSearchPrefill}
            modifyPrefillRef={modifyPrefillRef}
            portalRebookBootstrap={portalRebookBootstrap}
            tripRequestPhoneCountryIso2Hint={tripRequestPhoneCountryIso2Hint}
          />
        </div>
      </div>
    </div>
  );
}
