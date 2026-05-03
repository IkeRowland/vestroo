import { describe, expect, it } from 'vitest';

import { johannesburgRideToDatetimeLocalValue } from '../TripRequestPickupSchedule';

describe('johannesburgRideToDatetimeLocalValue', () => {
  it('returns empty string when inputs do not form a valid ride moment', () => {
    expect(johannesburgRideToDatetimeLocalValue('', '')).toBe('');
  });

  it('returns a datetime-local shaped string for valid Johannesburg ride fields', () => {
    const raw = johannesburgRideToDatetimeLocalValue('2026-06-15', '14:30');
    expect(raw).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
