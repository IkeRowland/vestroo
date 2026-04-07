'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export type BookingStep = 'search' | 'quote' | 'details' | 'payment' | 'confirmation';

interface BookingWizardStepperProps {
  currentStep: BookingStep;
  className?: string;
}

const steps: { key: BookingStep; label: string; number: number }[] = [
  { key: 'search', label: 'Search', number: 1 },
  { key: 'quote', label: 'Quote', number: 2 },
  { key: 'details', label: 'Details', number: 3 },
  { key: 'payment', label: 'Payment', number: 4 },
  { key: 'confirmation', label: 'Confirmation', number: 5 },
];

export function BookingWizardStepper({ currentStep, className }: BookingWizardStepperProps) {
  const currentStepIndex = steps.findIndex((step) => step.key === currentStep);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isCompleted = index < currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center flex-1">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isCompleted
                      ? '#25A89B'
                      : isActive
                        ? '#25A89B'
                        : '#e2e8f0',
                  }}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors',
                    {
                      'bg-[#25A89B] text-white': isCompleted || isActive,
                      'bg-slate-200 text-slate-600': isUpcoming,
                    }
                  )}
                >
                  {isCompleted ? (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  ) : (
                    step.number
                  )}
                </motion.div>
                <span
                  className={cn('mt-2 text-xs font-medium text-center hidden sm:block', {
                    'text-[#25A89B]': isActive || isCompleted,
                    'text-slate-500': isUpcoming,
                  })}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn('h-0.5 flex-1 mx-2 transition-colors', {
                    'bg-[#25A89B]': index < currentStepIndex,
                    'bg-slate-200': index >= currentStepIndex,
                  })}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

