import { describe, expect, it } from 'vitest';

import { defaultRideDetailsFormValues, type TripRequestLocation } from '../ride-details-validate';
import { swapRideDetailsPickupDestination } from '../swap-ride-details';

const loc = (id: string): TripRequestLocation => ({
  placeId: id,
  formattedAddress: `Address ${id}`,
  name: `Name ${id}`,
  latitude: -26.1,
  longitude: 28.0,
  types: ['establishment'],
});

describe('swapRideDetailsPickupDestination', () => {
  it('exchanges pickup, destination, and string inputs', () => {
    const base = defaultRideDetailsFormValues();
    const pickup = loc('pickup');
    const destination = loc('dest');
    const values = {
      ...base,
      pickup,
      destination,
      pickupInput: 'pickup text',
      destinationInput: 'dest text',
    };
    expect(swapRideDetailsPickupDestination(values)).toEqual({
      pickup: destination,
      destination: pickup,
      pickupInput: 'dest text',
      destinationInput: 'pickup text',
    });
  });
});
