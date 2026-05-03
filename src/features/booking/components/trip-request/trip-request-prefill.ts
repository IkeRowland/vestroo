import type { Location } from '@/features/booking/hooks/useBookingStore';

import type { RideDetailsFormValues, TripRequestLocation } from './ride-details-validate';

export const TRIP_REQUEST_PREFILL_STORAGE_KEY = 'vestroo-trip-request-prefill-v1';

type PrefillEnvelope = {
  v: 1;
  rideDetails: RideDetailsFormValues;
};

export function storeLocationToTripRequestLocation(loc: Location): TripRequestLocation {
  return {
    placeId: loc.placeId,
    formattedAddress: loc.formattedAddress,
    name: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    types: loc.isAirport ? ['airport'] : undefined,
  };
}

/** Build Slide 1 state from the booking search form (homepage or `/book/search`) before the trip-request funnel (embedded or `/book/trip-request`). */
export function rideDetailsFromMarketingP2P(args: {
  origin: Location;
  destination: Location;
  pickupInput: string;
  destinationInput: string;
  dateWithTime: Date;
  passengers: number;
  specialInstructions: string;
  flightNumber: string;
  showFlightNumber: boolean;
}): RideDetailsFormValues {
  const dt = args.dateWithTime;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return {
    pickup: storeLocationToTripRequestLocation(args.origin),
    destination: storeLocationToTripRequestLocation(args.destination),
    pickupInput: args.pickupInput,
    destinationInput: args.destinationInput,
    rideDate: `${y}-${m}-${d}`,
    rideTime: `${hh}:${mm}`,
    passengers: args.passengers,
    specialInstructions: args.specialInstructions.trim(),
    manualAirportPickup: false,
    flightNumber: args.showFlightNumber && args.flightNumber.trim() ? args.flightNumber.trim() : '',
  };
}

/** Cleared whenever a new prefill is saved so the next funnel run reads fresh data. */
let bootstrapPrefillMemory: RideDetailsFormValues | null = null;

export function saveTripRequestPrefill(rideDetails: RideDetailsFormValues): void {
  if (typeof window === 'undefined') return;
  bootstrapPrefillMemory = null;
  const payload: PrefillEnvelope = { v: 1, rideDetails };
  try {
    sessionStorage.setItem(TRIP_REQUEST_PREFILL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Returns ride prefill for trip-request bootstrap. Safe under React Strict Mode (dev):
 * the first read copies sessionStorage into module memory and clears storage; subsequent
 * reads in the same page session return the same object without losing data.
 */
export function getTripRequestPrefillForBootstrap(): RideDetailsFormValues | null {
  if (typeof window === 'undefined') return null;
  if (bootstrapPrefillMemory) return bootstrapPrefillMemory;
  try {
    const raw = sessionStorage.getItem(TRIP_REQUEST_PREFILL_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(TRIP_REQUEST_PREFILL_STORAGE_KEY);
    const parsed = JSON.parse(raw) as PrefillEnvelope;
    if (parsed.v !== 1 || !parsed.rideDetails) return null;
    bootstrapPrefillMemory = parsed.rideDetails;
    return bootstrapPrefillMemory;
  } catch {
    return null;
  }
}
