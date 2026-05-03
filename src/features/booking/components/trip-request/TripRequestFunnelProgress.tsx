'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const LABELS = ['Trip', 'Vehicle', 'Details', 'Done'] as const;

export type TripRequestFunnelProgressProps = {
  /** 0 = Trip … 3 = Done (only current after successful submit). */
  currentIndex: number;
  className?: string;
};

/**
 * Visible progress for the public trip-request funnel (FE.19.1).
 * Keyboard users reach it in tab order before slide content; `aria-current="step"` marks the active step.
 */
export function TripRequestFunnelProgress({ currentIndex, className }: TripRequestFunnelProgressProps) {
  return (
    <nav aria-label="Trip request progress" className={cn('w-full', className)}>
      <ol className="flex flex-wrap items-stretch justify-between gap-2 sm:gap-1">
        {LABELS.map((label, i) => {
          const isCurrent = i === currentIndex;
          const isComplete = i < currentIndex;
          return (
            <li
              key={label}
              className="flex min-w-[4.25rem] flex-1 flex-col items-center gap-1.5 text-center"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-9 min-h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors',
                  isComplete && 'bg-primary text-primary-foreground',
                  isCurrent &&
                    'bg-vest-rust text-white ring-2 ring-vest-rust ring-offset-2 ring-offset-background',
                  !isComplete && !isCurrent && 'bg-muted text-muted-foreground',
                )}
                aria-hidden
              >
                {isComplete ? '✓' : i + 1}
              </span>
              <span
                className={cn(
                  'max-w-[5.5rem] text-[0.65rem] font-medium leading-tight sm:text-xs font-Poppins',
                  isComplete && 'text-primary',
                  isCurrent && 'text-vest-rust',
                  !isCurrent && !isComplete && 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
