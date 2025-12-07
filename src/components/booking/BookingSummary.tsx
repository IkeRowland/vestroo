'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface BookingSummaryProps {
  origin: string;
  destination: string;
  date: Date;
  time: string;
  passengerCount: number;
  vehicleName: string;
  vehicleCapacity: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  flightNumber?: string | null;
  finalPrice: number;
}

export function BookingSummary({
  origin,
  destination,
  date,
  time,
  passengerCount,
  vehicleName,
  vehicleCapacity,
  customerName,
  customerEmail,
  customerPhone,
  flightNumber,
  finalPrice,
}: BookingSummaryProps) {
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
        <CardTitle>Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trip Details */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Trip Details</h3>
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
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600">Date</span>
              <p className="font-medium text-slate-900">{formatDate(date)}</p>
            </div>
            <div>
              <span className="text-slate-600">Time</span>
              <p className="font-medium text-slate-900">{time}</p>
            </div>
            <div>
              <span className="text-slate-600">Passengers</span>
              <p className="font-medium text-slate-900">{passengerCount}</p>
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Vehicle</h3>
          <div className="text-sm">
            <p className="font-medium text-slate-900">{vehicleName}</p>
            <p className="text-slate-600 mt-1">Capacity: {vehicleCapacity} passengers</p>
          </div>
        </div>

        {/* Passenger Details */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Passenger Details</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-600">Name</span>
              <p className="font-medium text-slate-900">{customerName}</p>
            </div>
            <div>
              <span className="text-slate-600">Email</span>
              <p className="font-medium text-slate-900">{customerEmail}</p>
            </div>
            <div>
              <span className="text-slate-600">Phone</span>
              <p className="font-medium text-slate-900">{customerPhone}</p>
            </div>
            {flightNumber && (
              <div>
                <span className="text-slate-600">Flight Number</span>
                <p className="font-medium text-slate-900">{flightNumber}</p>
              </div>
            )}
          </div>
        </div>

        {/* Final Price */}
        <div className="pt-4 border-t-2 border-slate-300">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-slate-900">Total Amount</span>
            <span className="text-3xl font-bold text-[#25A89B]">R {finalPrice.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

