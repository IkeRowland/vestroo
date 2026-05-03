import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TRIP_REQUEST_PREFILL_STORAGE_KEY } from './trip-request-prefill';
import type { RideDetailsFormValues } from './ride-details-validate';

function createSessionStorageMock() {
  const mem: Record<string, string> = {};
  return {
    getItem: (k: string) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k]! : null),
    setItem: (k: string, v: string) => {
      mem[k] = v;
    },
    removeItem: (k: string) => {
      delete mem[k];
    },
  } as Storage;
}

function sampleRideDetails(): RideDetailsFormValues {
  const future = new Date(Date.now() + 86_400_000);
  const y = future.getFullYear();
  const m = String(future.getMonth() + 1).padStart(2, '0');
  const d = String(future.getDate()).padStart(2, '0');
  return {
    pickup: {
      placeId: 'p1',
      formattedAddress: '1 Test St',
      name: 'Pickup',
      latitude: -26,
      longitude: 28,
    },
    destination: {
      placeId: 'p2',
      formattedAddress: '2 Test St',
      name: 'Drop',
      latitude: -26.1,
      longitude: 28.1,
    },
    pickupInput: '1 Test St',
    destinationInput: '2 Test St',
    rideDate: `${y}-${m}-${d}`,
    rideTime: '12:00',
    passengers: 2,
    specialInstructions: '',
    manualAirportPickup: false,
    flightNumber: '',
  };
}

describe('trip-request-prefill bootstrap (FE.10 / Strict Mode safety)', () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = createSessionStorageMock();
    vi.stubGlobal('sessionStorage', storage);
    // `saveTripRequestPrefill` / `getTripRequestPrefillForBootstrap` guard on `window` (Vitest default: node).
    vi.stubGlobal('window', { sessionStorage: storage } as unknown as Window);
  });

  it('getTripRequestPrefillForBootstrap returns the same data on consecutive reads', async () => {
    const { saveTripRequestPrefill, getTripRequestPrefillForBootstrap } = await import(
      './trip-request-prefill'
    );
    const rd = sampleRideDetails();
    saveTripRequestPrefill(rd);

    const a = getTripRequestPrefillForBootstrap();
    const b = getTripRequestPrefillForBootstrap();
    expect(a).toEqual(rd);
    expect(b).toEqual(rd);
  });

  it('clears sessionStorage after first read but keeps module cache', async () => {
    const { saveTripRequestPrefill, getTripRequestPrefillForBootstrap } = await import(
      './trip-request-prefill'
    );
    saveTripRequestPrefill(sampleRideDetails());
    getTripRequestPrefillForBootstrap();
    expect(globalThis.sessionStorage.getItem(TRIP_REQUEST_PREFILL_STORAGE_KEY)).toBeNull();
    expect(getTripRequestPrefillForBootstrap()).not.toBeNull();
  });
});

describe('rideDetailsFromMarketingP2P', () => {
  it('maps locations and formats date fields', async () => {
    const { rideDetailsFromMarketingP2P, storeLocationToTripRequestLocation } = await import(
      './trip-request-prefill'
    );
    const origin = {
      placeId: 'o1',
      formattedAddress: 'A',
      name: 'A',
      latitude: 1,
      longitude: 2,
      isAirport: false,
    };
    const destination = {
      placeId: 'd1',
      formattedAddress: 'B',
      name: 'B',
      latitude: 3,
      longitude: 4,
      isAirport: false,
    };
    const dt = new Date(2026, 5, 15, 14, 30, 0);
    const v = rideDetailsFromMarketingP2P({
      origin,
      destination,
      pickupInput: 'typed pickup',
      destinationInput: 'typed drop',
      dateWithTime: dt,
      passengers: 3,
      specialInstructions: '  door B  ',
      flightNumber: 'SA123',
      showFlightNumber: true,
    });
    expect(v.rideDate).toBe('2026-06-15');
    expect(v.rideTime).toBe('14:30');
    expect(v.passengers).toBe(3);
    expect(v.specialInstructions).toBe('door B');
    expect(v.flightNumber).toBe('SA123');
    expect(storeLocationToTripRequestLocation({ ...origin, isAirport: true }).types).toEqual([
      'airport',
    ]);
  });
});
