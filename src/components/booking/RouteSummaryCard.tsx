'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface RouteSummaryCardProps {
  origin: string;
  destination: string;
  date: Date;
  time: string;
  passengerCount: number;
}

export function RouteSummaryCard({
  origin,
  destination,
  date,
  time,
  passengerCount,
}: RouteSummaryCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trip Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#25A89B] mt-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-slate-500">From</p>
              <p className="font-medium text-slate-900">{origin}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 ml-1">
            <div className="w-0.5 h-8 bg-slate-300 ml-0.5" />
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-slate-500">To</p>
              <p className="font-medium text-slate-900">{destination}</p>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Date</span>
            <span className="text-sm font-medium text-slate-900">{formatDate(date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Time</span>
            <span className="text-sm font-medium text-slate-900">{time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Passengers</span>
            <span className="text-sm font-medium text-slate-900">{passengerCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

