import type { RideDetailsFormValues } from './ride-details-validate';

/**
 * Exchanges pickup and drop-off labels and resolved locations (Story 19.3 / FE.19.3).
 * Does not alter airport toggle, flight, or other slide-1 fields.
 */
export function swapRideDetailsPickupDestination(
  values: RideDetailsFormValues,
): Partial<RideDetailsFormValues> {
  return {
    pickup: values.destination,
    destination: values.pickup,
    pickupInput: values.destinationInput,
    destinationInput: values.pickupInput,
  };
}
