'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Changes to paid trips are handled by dispatch — avoids conflicting with the recorded
 * payment state for the booking.
 */
export default function BookModifyPage() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Change your booking</h1>
        <p className="text-slate-600 text-sm">
          Updates to pickup time, route, or vehicle are coordinated with our team so your{' '}
          <strong>trip</strong> stays aligned with driver and <strong>run</strong> planning.
        </p>
        <Button asChild className="bg-[#25A89B] hover:bg-[#1f8f83]">
          <Link href="/contact">Contact us</Link>
        </Button>
        <div>
          <Link href="/book/search" className="text-sm text-slate-500 underline-offset-2 hover:underline">
            Back to booking search
          </Link>
        </div>
      </div>
    </div>
  );
}
