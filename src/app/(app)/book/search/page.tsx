import { Suspense } from 'react';

import { BookingSearchForm } from '@/features/booking/components/BookingSearchForm';
import { E2eBookingFixtureLoader } from '@/features/booking/components/e2e-booking-fixture-loader';

/** Avoid stale SSR HTML after client-component markup changes (hydration vs old .next cache). */
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

/**
 * Booking Search Page
 * `?tab=login` opens the modify / lookup flow (matches header "LOGIN").
 */
export default async function BookingSearchPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const initialTab =
    tab === 'login' ? 'modify-booking' : 'create-booking';

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center">
          <Suspense fallback={null}>
            <E2eBookingFixtureLoader />
          </Suspense>
          <BookingSearchForm initialTab={initialTab} />
        </div>
      </div>
    </div>
  );
}
