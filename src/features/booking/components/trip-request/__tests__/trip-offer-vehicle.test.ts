import { describe, expect, it } from 'vitest';

import {
  classificationFromFleetCategoryName,
  FORBIDDEN_TRIP_OFFER_KEYS,
  parseTripOfferVehicleFromUnknown,
  tripOfferVehicleSchema,
} from '../trip-offer-vehicle';

describe('tripOfferVehicleSchema', () => {
  it('accepts a minimal valid vehicle', () => {
    const v = tripOfferVehicleSchema.parse({
      id: 'a',
      name: 'Premium Sedan',
      classification: 'Sedan class',
      passengerCapacity: 4,
      luggageCapacityLabel: '2 suitcases (capacity guide)',
      imageUrl: null,
    });
    expect(v.id).toBe('a');
  });
});

describe('classificationFromFleetCategoryName', () => {
  it('uses fleet category name when present', () => {
    expect(classificationFromFleetCategoryName('SUV', 5)).toBe('SUV class');
    expect(classificationFromFleetCategoryName('MPV', 7)).toBe('MPV class');
  });

  it('falls back to capacity bands when category name is empty', () => {
    expect(classificationFromFleetCategoryName('', 5)).toBe('MPV class');
    expect(classificationFromFleetCategoryName(null, 14)).toBe('Minibus class');
  });
});

describe('parseTripOfferVehicleFromUnknown', () => {
  it('returns null when a forbidden key is present', () => {
    const bad = {
      id: 'x',
      name: 'Test',
      classification: 'Sedan class',
      passengerCapacity: 4,
      luggageCapacityLabel: '2 bags',
      price: 99,
    };
    expect(parseTripOfferVehicleFromUnknown(bad)).toBeNull();
  });

  it('lists defensive keys for documentation', () => {
    expect(FORBIDDEN_TRIP_OFFER_KEYS.length).toBeGreaterThan(5);
  });
});
