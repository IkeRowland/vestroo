'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import type { TripOfferVehicle } from './trip-offer-vehicle';

type TripRequestVehicleSlideProps = {
  vehicles: TripOfferVehicle[];
  selectedId: string | null;
  /** From validated slide 1 — compare to each vehicle's passengerCapacity (FE.19.5). */
  partyPassengers: number;
  onSelect: (id: string) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  selectionError: string | null;
};

function VehicleImage({ vehicle }: { vehicle: TripOfferVehicle }) {
  const src = vehicle.imageUrl?.trim();
  if (!src) {
    return (
      <div
        className="flex aspect-[4/3] w-full max-h-28 min-h-[6.5rem] max-w-[10rem] items-center justify-center rounded-lg bg-slate-200"
        aria-hidden
      >
        <svg className="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fleet URLs vary; explicit dimensions reduce CLS
    <img
      src={src}
      alt=""
      width={160}
      height={120}
      loading="lazy"
      decoding="async"
      className="aspect-[4/3] h-auto w-full max-h-28 max-w-[10rem] rounded-lg object-cover"
    />
  );
}

function SkeletonCards() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading vehicle options"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex gap-4">
            <div className="h-28 w-40 shrink-0 rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 rounded bg-slate-200" />
              <div className="h-4 w-1/3 rounded bg-slate-100" />
              <div className="h-4 w-full rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TripRequestVehicleSlide({
  vehicles,
  selectedId,
  partyPassengers,
  onSelect,
  loading,
  error,
  onRetry,
  selectionError,
}: TripRequestVehicleSlideProps) {
  const groupName = 'trip-request-vehicle';

  return (
    <div className="space-y-5 font-Poppins">
      {loading && <SkeletonCards />}

      {!loading && error && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-11 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && vehicles.length === 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          <p className="font-display font-semibold text-foreground">No vehicle classes match your party size</p>
          <p className="mt-2">
            Adjust the number of passengers on the booking form and submit again, or contact us for
            special arrangements.
          </p>
        </div>
      )}

      {!loading && !error && vehicles.length > 0 && (
        <fieldset className="space-y-3 border-0 p-0">
          <legend className="sr-only">
            Vehicle selection required — choose exactly one option from the list below
          </legend>
          <div className="space-y-3" role="radiogroup" aria-required="true">
            {vehicles.map((v) => {
              const selected = selectedId === v.id;
              const overCapacity = partyPassengers > v.passengerCapacity;
              return (
                <label
                  key={v.id}
                  className={cn(
                    'flex cursor-pointer gap-4 rounded-xl border p-4 transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                    selected
                      ? 'border-vest-rust bg-vest-rust/5 shadow-md ring-2 ring-vest-rust'
                      : 'border-border bg-card hover:border-primary/30',
                    overCapacity && 'opacity-60 ring-1 ring-amber-200/80',
                  )}
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={v.id}
                    checked={selected}
                    onChange={() => onSelect(v.id)}
                    className="mt-1 h-4 w-4 shrink-0 border-border text-vest-rust focus:ring-vest-rust"
                    aria-describedby={`vehicle-${v.id}-desc`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <VehicleImage vehicle={v} />
                      <div className="min-w-0 flex-1" id={`vehicle-${v.id}-desc`}>
                        <p className="font-display text-xs font-semibold uppercase tracking-wide text-primary">
                          {v.classification}
                        </p>
                        <p className="font-display text-lg font-semibold text-foreground">{v.name}</p>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <li>Up to {v.passengerCapacity} passengers</li>
                          <li>Bags: {v.luggageCapacityLabel}</li>
                        </ul>
                        {overCapacity ? (
                          <p className="mt-2 text-xs font-medium text-amber-900" role="note">
                            Capacity: {v.passengerCapacity} — pick a larger class
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {selectionError ? (
        <p className="text-sm text-destructive font-Poppins" role="alert" aria-live="assertive">
          {selectionError}
        </p>
      ) : null}
    </div>
  );
}
