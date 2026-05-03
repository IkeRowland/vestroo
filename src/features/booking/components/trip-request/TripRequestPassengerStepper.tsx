'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const MIN = 1;
const MAX = 20;

function clamp(n: number): number {
  return Math.min(MAX, Math.max(MIN, Math.round(n)));
}

export type TripRequestPassengerStepperProps = {
  id: string;
  value: number;
  onChange: (passengers: number) => void;
  error?: string;
};

/**
 * Slide 1 passenger count — FE.19.5: primary − / +, min/max with aria-disabled, spinbutton keyboard.
 */
export function TripRequestPassengerStepper({ id, value, onChange, error }: TripRequestPassengerStepperProps) {
  const safe = Number.isFinite(value) ? clamp(value) : MIN;
  const decDisabled = safe <= MIN;
  const incDisabled = safe >= MAX;

  const decrement = React.useCallback(() => {
    if (!decDisabled) onChange(clamp(safe - 1));
  }, [decDisabled, onChange, safe]);

  const increment = React.useCallback(() => {
    if (!incDisabled) onChange(clamp(safe + 1));
  }, [incDisabled, onChange, safe]);

  const onSpinKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const stepBig = 5;
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowLeft':
          e.preventDefault();
          decrement();
          break;
        case 'ArrowUp':
        case 'ArrowRight':
          e.preventDefault();
          increment();
          break;
        case 'Home':
          e.preventDefault();
          if (!decDisabled || safe !== MIN) onChange(MIN);
          break;
        case 'End':
          e.preventDefault();
          if (!incDisabled || safe !== MAX) onChange(MAX);
          break;
        case 'PageDown':
          e.preventDefault();
          onChange(clamp(safe - stepBig));
          break;
        case 'PageUp':
          e.preventDefault();
          onChange(clamp(safe + stepBig));
          break;
        default:
          break;
      }
    },
    [decrement, increment, decDisabled, incDisabled, onChange, safe],
  );

  return (
    <div className="space-y-2 font-Poppins">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(
            'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-lg font-semibold text-foreground shadow-sm transition',
            'hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            decDisabled && 'cursor-not-allowed opacity-40',
          )}
          aria-label="Decrease passengers"
          aria-controls={id}
          aria-disabled={decDisabled}
          disabled={decDisabled}
          onClick={decrement}
        >
          −
        </button>

        <div
          id={id}
          role="spinbutton"
          tabIndex={0}
          aria-valuenow={safe}
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-label="Number of passengers"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onKeyDown={onSpinKeyDown}
          className={cn(
            'flex min-h-11 min-w-[3.5rem] items-center justify-center rounded-lg border border-border bg-card px-3 text-lg font-semibold tabular-nums text-foreground shadow-sm outline-none',
            'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/35',
            error && 'border-destructive',
          )}
        >
          {safe}
        </div>

        <button
          type="button"
          className={cn(
            'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-lg font-semibold text-foreground shadow-sm transition',
            'hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            incDisabled && 'cursor-not-allowed opacity-40',
          )}
          aria-label="Increase passengers"
          aria-controls={id}
          aria-disabled={incDisabled}
          disabled={incDisabled}
          onClick={increment}
        >
          +
        </button>
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive font-Poppins" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
