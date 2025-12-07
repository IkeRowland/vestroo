import { BookingSearchForm } from '@/features/booking/components/BookingSearchForm';

/**
 * Booking Search Page
 * Allows users to input trip details and get a quote
 * This is a Server Component that renders a Client Component
 */
export default function BookingSearchPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center">
          <BookingSearchForm />
        </div>
      </div>
    </div>
  );
}

