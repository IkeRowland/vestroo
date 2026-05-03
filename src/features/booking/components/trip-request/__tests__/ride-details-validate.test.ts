import { describe, expect, it } from 'vitest';

import {
  combineRideDateAndTime,
  defaultRideDetailsFormValues,
  effectiveAirportPickup,
  PICKUP_SCHEDULE_LEAD_MESSAGE,
  rideDateTimeFutureCheck,
  rideDateTimeIsInPast,
  TRIP_REQUEST_MIN_LEAD_MS,
  validateRideDetailsStep,
} from '../ride-details-validate';

const baseLoc = {
  placeId: 'ChIJx',
  formattedAddress: '1 Example St',
  name: 'Example',
  latitude: -26.0,
  longitude: 28.0,
};

describe('validateRideDetailsStep', () => {
  it('requires pickup, destination, and future datetime', () => {
    const v = defaultRideDetailsFormValues();
    const r = validateRideDetailsStep(v);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.pickup).toBeDefined();
    expect(r.errors.destination).toBeDefined();
  });

  it('passes with two places and future time', () => {
    const r = validateRideDetailsStep({
      ...defaultRideDetailsFormValues(),
      pickup: { ...baseLoc, types: ['establishment'] },
      destination: { ...baseLoc, placeId: 'ChIJy' },
      pickupInput: baseLoc.formattedAddress,
      destinationInput: baseLoc.formattedAddress,
      rideDate: '2099-06-20',
      rideTime: '12:00',
      passengers: 2,
    });
    expect(r.ok).toBe(true);
  });

  it('allows empty flight number when airport pickup applies (optional in booking UI)', () => {
    const r = validateRideDetailsStep({
      ...defaultRideDetailsFormValues(),
      pickup: { ...baseLoc, types: ['airport'] },
      destination: { ...baseLoc, placeId: 'ChIJy' },
      pickupInput: baseLoc.formattedAddress,
      destinationInput: baseLoc.formattedAddress,
      rideDate: '2099-06-20',
      rideTime: '12:00',
      passengers: 1,
      flightNumber: '',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.flightNumber).toBe('');
  });
});

describe('effectiveAirportPickup', () => {
  it('is true when manual toggle is on', () => {
    expect(effectiveAirportPickup(null, true)).toBe(true);
  });

  it('is false when non-airport place and manual off', () => {
    expect(
      effectiveAirportPickup(
        { ...baseLoc, types: ['establishment'] },
        false,
      ),
    ).toBe(false);
  });
});

describe('combineRideDateAndTime', () => {
  it('returns null for empty inputs', () => {
    expect(combineRideDateAndTime('', '12:00')).toBeNull();
    expect(combineRideDateAndTime('2026-01-01', '')).toBeNull();
    expect(combineRideDateAndTime('   ', '12:00')).toBeNull();
  });

  it('returns null for an unparseable combined string', () => {
    expect(combineRideDateAndTime('not-a-date', '12:00')).toBeNull();
    expect(combineRideDateAndTime('2026-13-40', '99:99')).toBeNull();
  });

  it('returns a Date for valid inputs (Johannesburg wall clock → instant)', () => {
    const d = combineRideDateAndTime('2026-06-15', '14:30');
    expect(d).toBeInstanceOf(Date);
    expect(d?.getTime()).toBe(Date.UTC(2026, 5, 15, 12, 30, 0));
  });
});

describe('rideDateTimeIsInPast (60-minute lead gate)', () => {
  it('returns true when pickup is less than 60 minutes ahead', () => {
    const now = Date.now();
    expect(rideDateTimeIsInPast(new Date(now + 30 * 60 * 1000), now)).toBe(true);
  });

  it('returns false when pickup is at least 60 minutes ahead', () => {
    const now = Date.now();
    expect(rideDateTimeIsInPast(new Date(now + 61 * 60 * 1000), now)).toBe(false);
  });

  it('returns false when pickup is exactly on the 60-minute boundary', () => {
    const now = Date.now();
    expect(rideDateTimeIsInPast(new Date(now + TRIP_REQUEST_MIN_LEAD_MS), now)).toBe(false);
  });
});

describe('rideDateTimeFutureCheck', () => {
  it('returns ok when either field is empty (caller flags missing fields separately)', () => {
    expect(rideDateTimeFutureCheck('', '12:00').kind).toBe('ok');
    expect(rideDateTimeFutureCheck('2026-01-01', '').kind).toBe('ok');
  });

  it('flags invalid_format for unparseable inputs', () => {
    expect(rideDateTimeFutureCheck('2026-13-40', '99:99').kind).toBe('invalid_format');
  });

  it('flags insufficient_lead for a moment in the past', () => {
    expect(rideDateTimeFutureCheck('2000-01-01', '08:00').kind).toBe('insufficient_lead');
  });

  it('returns ok for a pickup far in the future', () => {
    expect(rideDateTimeFutureCheck('2099-06-15', '12:00').kind).toBe('ok');
  });

  it('respects the injected `now` argument (60-minute buffer)', () => {
    const ride = combineRideDateAndTime('2026-06-15', '12:00')!.getTime();
    expect(rideDateTimeFutureCheck('2026-06-15', '12:00', ride - 61 * 60 * 1000).kind).toBe('ok');
    expect(rideDateTimeFutureCheck('2026-06-15', '12:00', ride - 30 * 60 * 1000).kind).toBe(
      'insufficient_lead',
    );
  });
});

describe('defaultRideDetailsFormValues', () => {
  it('defaults passengers to 1 (FE.19.2)', () => {
    expect(defaultRideDetailsFormValues({ now: Date.UTC(2026, 3, 30, 10, 0, 0) }).passengers).toBe(1);
  });
});

describe('validateRideDetailsStep — pickup schedule lead time', () => {
  it('rejects pickup wall-clock before the 60-minute buffer and surfaces errors.schedule', () => {
    const r = validateRideDetailsStep({
      ...defaultRideDetailsFormValues(),
      pickup: { ...baseLoc, types: ['establishment'] },
      destination: { ...baseLoc, placeId: 'ChIJy' },
      pickupInput: baseLoc.formattedAddress,
      destinationInput: baseLoc.formattedAddress,
      rideDate: '2000-01-15',
      rideTime: '08:00',
      passengers: 2,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.schedule).toBe(PICKUP_SCHEDULE_LEAD_MESSAGE);
  });
});
