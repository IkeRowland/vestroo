import type { BookingState } from '@/features/booking/hooks/useBookingStore';
import { requireQuoteData, requireVehicleSelection, requireCustomerDetails } from './booking-guards';

export type NavigationStep = 'search' | 'quote' | 'details' | 'payment' | 'confirmation';

/**
 * Validates state before navigation to a step
 */
export function validateNavigationToStep(
  step: NavigationStep,
  state: Partial<BookingState>
): { canNavigate: boolean; error?: string } {
  switch (step) {
    case 'quote': {
      const quoteResult = requireQuoteData(state);
      if (!quoteResult.isValid) {
        return {
          canNavigate: false,
          error: 'Please complete the search step first',
        };
      }
      return { canNavigate: true };
    }
    case 'details': {
      const vehicleResult = requireVehicleSelection(state);
      if (!vehicleResult.isValid) {
        return {
          canNavigate: false,
          error: 'Please select a vehicle first',
        };
      }
      return { canNavigate: true };
    }
    case 'payment': {
      const customerResult = requireCustomerDetails(state);
      if (!customerResult.isValid) {
        return {
          canNavigate: false,
          error: 'Please provide contact details first',
        };
      }
      return { canNavigate: true };
    }
    case 'confirmation':
      // Confirmation validation will be added in Story 1.3
      return { canNavigate: true };
    case 'search':
      return { canNavigate: true };
    default:
      return { canNavigate: true };
  }
}

/**
 * Gets the next step in the booking flow
 * Temporarily skips payment step - will be added back when Payfast is configured
 */
export function getNextStep(currentStep: NavigationStep): NavigationStep | null {
  // Temporarily removed payment step
  const steps: NavigationStep[] = ['search', 'quote', 'details', 'confirmation'];
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex < steps.length - 1) {
    return steps[currentIndex + 1];
  }
  return null;
}

/**
 * Gets the previous step in the booking flow
 * Temporarily skips payment step - will be added back when Payfast is configured
 */
export function getPreviousStep(currentStep: NavigationStep): NavigationStep | null {
  // Temporarily removed payment step
  const steps: NavigationStep[] = ['search', 'quote', 'details', 'confirmation'];
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex > 0) {
    return steps[currentIndex - 1];
  }
  return null;
}

/**
 * Gets the route path for a step
 */
export function getStepRoute(step: NavigationStep): string {
  switch (step) {
    case 'search':
      return '/book/search';
    case 'quote':
      return '/book/quote';
    case 'details':
      return '/book/details';
    case 'payment':
      return '/book/payment';
    case 'confirmation':
      return '/confirmation';
    default:
      return '/book/search';
  }
}

