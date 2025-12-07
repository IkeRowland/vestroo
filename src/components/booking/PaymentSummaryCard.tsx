'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentSummaryCardProps {
  basePrice: number;
  fees?: number;
  total: number;
  origin: string;
  destination: string;
  date: Date;
  time: string;
  passengers: number;
  vehicleName: string;
}

export function PaymentSummaryCard({
  basePrice,
  fees = 0,
  total,
  origin,
  destination,
  date,
  time,
  passengers,
  vehicleName,
}: PaymentSummaryCardProps) {
  const formattedDate = new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl">Payment Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Route Summary */}
        <div className="space-y-3 pb-4 border-b border-slate-200">
          <div>
            <p className="text-sm text-slate-600 mb-1">From</p>
            <p className="font-medium text-slate-900">{origin}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">To</p>
            <p className="font-medium text-slate-900">{destination}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-sm text-slate-600 mb-1">Date</p>
              <p className="font-medium text-slate-900">{formattedDate}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Time</p>
              <p className="font-medium text-slate-900">{time}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Passengers</p>
              <p className="font-medium text-slate-900">{passengers}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Vehicle</p>
              <p className="font-medium text-slate-900">{vehicleName}</p>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between text-slate-700">
            <span>Base Price</span>
            <span className="font-medium">R {basePrice.toFixed(2)}</span>
          </div>
          {fees > 0 && (
            <div className="flex justify-between text-slate-700">
              <span>Fees</span>
              <span className="font-medium">R {fees.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-3 border-t-2 border-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-slate-900">Total</span>
              <span className="text-3xl font-bold text-[#25A89B]">R {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Security Indicators */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-700">PayFast</span>
              <span>Protected</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

