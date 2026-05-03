import type { BookingState } from '@/features/booking/hooks/useBookingStore';

/**
 * Wizard-step guards for the booking funnel. The `'payment'` guard type maps to the
 * **details** prerequisite (contact fields); settlement is **EFT + ops manual mark**
 * (Epic 16 Theme N), not a hosted checkout step in this module.
 */
export type GuardType = 'quote' | 'details' | 'payment' | 'confirmation';

export interface GuardResult {
  isValid: boolean;
  redirectPath: string;
}

/**
 * Checks if quote data (origin/destination) exists in store
 */
export function requireQuoteData(state: Partial<BookingState>): GuardResult {
  if (!state.origin || !state.destination) {
    return {
      isValid: false,
      redirectPath: '/book/search',
    };
  }
  return { isValid: true, redirectPath: '' };
}

/**
 * Checks if vehicle is selected in store
 */
export function requireVehicleSelection(state: Partial<BookingState>): GuardResult {
  if (!state.selectedVehicleId) {
    return {
      isValid: false,
      redirectPath: '/book/quote',
    };
  }
  return { isValid: true, redirectPath: '' };
}

/**
 * Checks if customer details exist in store
 */
export function requireCustomerDetails(state: Partial<BookingState>): GuardResult {
  if (!state.customer) {
    return {
      isValid: false,
      redirectPath: '/book/details',
    };
  }
  return { isValid: true, redirectPath: '' };
}

/**
 * Gets the appropriate guard function for a guard type
 */
export function getGuard(type: GuardType) {
  switch (type) {
    case 'quote':
      return requireQuoteData;
    case 'details':
      return requireVehicleSelection;
    case 'payment':
      return requireCustomerDetails;
    case 'confirmation':
      // Confirmation doesn't require a guard in this story (will be added in Story 1.3)
      return () => ({ isValid: true, redirectPath: '' });
    default:
      return () => ({ isValid: true, redirectPath: '' });
  }
}

