import { describe, expect, it } from 'vitest';

import {
  addJohannesburgCalendarDaysFromYmd,
  computeDefaultTripRequestRideDateTime,
  getJohannesburgWallPartsFromInstant,
  getJohannesburgTodayYmd,
  johannesburgWallToUtcInstant,
  roundUpToNext15MinutesJohannesburg,
} from '../trip-request-market-time';

describe('johannesburgWallToUtcInstant', () => {
  it('maps 14:30 SAST to 12:30 UTC on the same calendar day', () => {
    const ms = johannesburgWallToUtcInstant(2026, 6, 15, 14, 30);
    expect(ms).toBe(Date.UTC(2026, 5, 15, 12, 30, 0));
  });
});

describe('roundUpToNext15MinutesJohannesburg', () => {
  it('rounds up to the next 15-minute boundary on the same JNB calendar day', () => {
    const ms = johannesburgWallToUtcInstant(2026, 3, 10, 10, 7);
    expect(ms).not.toBeNull();
    const rounded = roundUpToNext15MinutesJohannesburg(ms!);
    const p = getJohannesburgWallPartsFromInstant(rounded);
    expect(p.hour).toBe(10);
    expect(p.minute).toBe(15);
  });
});

describe('addJohannesburgCalendarDaysFromYmd', () => {
  it('advances one Johannesburg calendar day', () => {
    const today = getJohannesburgTodayYmd(Date.UTC(2026, 5, 14, 10, 0, 0));
    const next = addJohannesburgCalendarDaysFromYmd(today, 1);
    expect(next).not.toBe(today);
    expect(next).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('computeDefaultTripRequestRideDateTime', () => {
  it('defaults passengers path: uses now+90m rounded and JNB calendar (fixture)', () => {
    // 2026-04-30 10:00:00 UTC ≈ 12:00 SAST — pick instant with known JNB parts via wall conversion
    const noonSast = johannesburgWallToUtcInstant(2026, 4, 30, 12, 0)!;
    const out = computeDefaultTripRequestRideDateTime(noonSast);
    expect(out.rideDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out.rideTime).toMatch(/^\d{2}:\d{2}$/);
    const [hh, mm] = out.rideTime.split(':').map((x) => Number.parseInt(x, 10));
    expect((hh * 60 + mm) % 15).toBe(0);
  });
});
