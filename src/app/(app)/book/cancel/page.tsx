'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cancelBooking } from '@/actions/cancelBooking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

function CancelPageInner() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id') || '';
  const [countryCode, setCountryCode] = useState('+27');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!bookingId) {
      setError('Missing booking. Open cancel from your reservation search.');
      return;
    }
    setPending(true);
    const result = await cancelBooking({
      bookingId,
      countryCode,
      phoneNumber,
    });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage('Your booking has been cancelled.');
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cancel booking</h1>
          <p className="text-sm text-slate-600 mt-1">
            Unpaid bookings can be cancelled here. Paid trips require staff assistance — use{' '}
            <Link href="/contact" className="text-[#25A89B] underline-offset-2 hover:underline">
              contact
            </Link>
            .
          </p>
        </div>

        {!bookingId && (
          <Alert>
            <AlertDescription>
              Find your reservation on{' '}
              <Link href="/book/search" className="font-medium underline">
                booking search
              </Link>{' '}
              first, then choose cancel.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cc">Country code</Label>
            <Select
              id="cc"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="h-11 w-full"
            >
              <option value="+27">+27 (ZA)</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="h-11"
              placeholder="Same number as on the booking"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="border-green-200 bg-green-50 text-green-900">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={pending || !bookingId}
            className="w-full bg-[#25A89B] hover:bg-[#1f8f83]"
          >
            {pending ? 'Cancelling…' : 'Confirm cancellation'}
          </Button>
        </form>

        <Link href="/book/search" className="block text-center text-sm text-slate-500 hover:underline">
          Back to search
        </Link>
      </div>
    </div>
  );
}

export default function BookCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-slate-600">Loading…</p>
        </div>
      }
    >
      <CancelPageInner />
    </Suspense>
  );
}
