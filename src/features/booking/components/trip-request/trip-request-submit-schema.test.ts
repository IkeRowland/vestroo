import { describe, it, expect } from 'vitest';

import {
  passengerPhoneToE164,
  tripRequestPassengerFieldsSchema,
  tripRequestRiderToDbColumns,
  tripRequestSubmitPayloadSchema,
} from '@/features/booking/components/trip-request/trip-request-submit-schema';

describe('tripRequestPassengerFieldsSchema', () => {
  it('accepts valid email and international phone (United Kingdom)', () => {
    const r = tripRequestPassengerFieldsSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      countryIso2: 'gb',
      phoneNational: '7911123456',
    });
    expect(r.success).toBe(true);
  });

  it('accepts valid phone for United States', () => {
    const r = tripRequestPassengerFieldsSchema.safeParse({
      firstName: 'Sam',
      lastName: 'Lee',
      email: 'sam@example.com',
      countryIso2: 'us',
      phoneNational: '2025550123',
    });
    expect(r.success).toBe(true);
  });

  it('rejects bad email', () => {
    const r = tripRequestPassengerFieldsSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'not-an-email',
      countryIso2: 'gb',
      phoneNational: '7911123456',
    });
    expect(r.success).toBe(false);
  });

  it('rejects phone that is not valid for selected country', () => {
    const r = tripRequestPassengerFieldsSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      countryIso2: 'gb',
      phoneNational: '000',
    });
    expect(r.success).toBe(false);
  });
});

describe('passengerPhoneToE164', () => {
  it('returns E.164 for GB mobile', () => {
    const e164 = passengerPhoneToE164('gb', '7911123456');
    expect(e164).toMatch(/^\+44/);
  });
});

describe('tripRequestSubmitPayloadSchema', () => {
  it('accepts a complete valid payload with future pickup datetime', () => {
    const future = new Date(Date.now() + 3 * 86_400_000);
    const y = future.getFullYear();
    const m = String(future.getMonth() + 1).padStart(2, '0');
    const d = String(future.getDate()).padStart(2, '0');

    const r = tripRequestSubmitPayloadSchema.safeParse({
      slide1: {
        pickup: {
          placeId: 'ChIJ1',
          formattedAddress: 'Pickup addr',
          name: 'P',
          latitude: -33.9,
          longitude: 18.4,
        },
        destination: {
          placeId: 'ChIJ2',
          formattedAddress: 'Drop addr',
          name: 'D',
          latitude: -33.91,
          longitude: 18.41,
        },
        rideDate: `${y}-${m}-${d}`,
        rideTime: '09:30',
        passengers: 2,
        specialInstructions: '',
        manualAirportPickup: false,
        flightNumber: '',
      },
      slide2: {
        id: 'vt-1',
        name: 'Premium Van',
        classification: 'Van class',
        passengerCapacity: 8,
        luggageCapacityLabel: '8 suitcases (capacity guide)',
        imageUrl: null,
      },
      slide3: {
        firstName: 'Alex',
        lastName: 'River',
        email: 'alex@example.com',
        countryIso2: 'za',
        phoneNational: '821234567',
      },
    });
    expect(r.success).toBe(true);
  });

  it('rejects when ride datetime is in the past', () => {
    const r = tripRequestSubmitPayloadSchema.safeParse({
      slide1: {
        pickup: {
          placeId: 'ChIJ1',
          formattedAddress: 'Pickup addr',
          name: 'P',
          latitude: -33.9,
          longitude: 18.4,
        },
        destination: {
          placeId: 'ChIJ2',
          formattedAddress: 'Drop addr',
          name: 'D',
          latitude: -33.91,
          longitude: 18.41,
        },
        rideDate: '2000-01-01',
        rideTime: '09:00',
        passengers: 1,
        specialInstructions: '',
        manualAirportPickup: false,
        flightNumber: '',
      },
      slide2: {
        id: 'vt-1',
        name: 'Premium Van',
        classification: 'Van class',
        passengerCapacity: 8,
        luggageCapacityLabel: '8 suitcases (capacity guide)',
        imageUrl: null,
      },
      slide3: {
        firstName: 'Alex',
        lastName: 'River',
        email: 'alex@example.com',
        countryIso2: 'za',
        phoneNational: '821234567',
      },
    });
    expect(r.success).toBe(false);
  });

  it('accepts optional rider with valid ZA national phone', () => {
    const future = new Date(Date.now() + 3 * 86_400_000);
    const y = future.getFullYear();
    const m = String(future.getMonth() + 1).padStart(2, '0');
    const d = String(future.getDate()).padStart(2, '0');

    const r = tripRequestSubmitPayloadSchema.safeParse({
      slide1: {
        pickup: {
          placeId: 'ChIJ1',
          formattedAddress: 'Pickup addr',
          name: 'P',
          latitude: -33.9,
          longitude: 18.4,
        },
        destination: {
          placeId: 'ChIJ2',
          formattedAddress: 'Drop addr',
          name: 'D',
          latitude: -33.91,
          longitude: 18.41,
        },
        rideDate: `${y}-${m}-${d}`,
        rideTime: '09:30',
        passengers: 2,
        specialInstructions: '',
        manualAirportPickup: false,
        flightNumber: '',
      },
      slide2: {
        id: 'vt-1',
        name: 'Premium Van',
        classification: 'Van class',
        passengerCapacity: 8,
        luggageCapacityLabel: '8 suitcases (capacity guide)',
        imageUrl: null,
      },
      slide3: {
        firstName: 'Alex',
        lastName: 'River',
        email: 'alex@example.com',
        countryIso2: 'za',
        phoneNational: '821234567',
      },
      rider: {
        name: 'Jamie Rider',
        email: 'jamie@example.com',
        phoneNational: '791234567',
      },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      const cols = tripRequestRiderToDbColumns(r.data.rider, r.data.slide3.countryIso2);
      expect(cols.rider_name).toBe('Jamie Rider');
      expect(cols.rider_email).toBe('jamie@example.com');
      expect(cols.rider_phone).toMatch(/^\+27/);
    }
  });

  it('rejects rider with invalid email', () => {
    const future = new Date(Date.now() + 3 * 86_400_000);
    const y = future.getFullYear();
    const m = String(future.getMonth() + 1).padStart(2, '0');
    const d = String(future.getDate()).padStart(2, '0');

    const r = tripRequestSubmitPayloadSchema.safeParse({
      slide1: {
        pickup: {
          placeId: 'ChIJ1',
          formattedAddress: 'Pickup addr',
          name: 'P',
          latitude: -33.9,
          longitude: 18.4,
        },
        destination: {
          placeId: 'ChIJ2',
          formattedAddress: 'Drop addr',
          name: 'D',
          latitude: -33.91,
          longitude: 18.41,
        },
        rideDate: `${y}-${m}-${d}`,
        rideTime: '09:30',
        passengers: 2,
        specialInstructions: '',
        manualAirportPickup: false,
        flightNumber: '',
      },
      slide2: {
        id: 'vt-1',
        name: 'Premium Van',
        classification: 'Van class',
        passengerCapacity: 8,
        luggageCapacityLabel: '8 suitcases (capacity guide)',
        imageUrl: null,
      },
      slide3: {
        firstName: 'Alex',
        lastName: 'River',
        email: 'alex@example.com',
        countryIso2: 'za',
        phoneNational: '821234567',
      },
      rider: { name: '', email: 'bad', phoneNational: '' },
    });
    expect(r.success).toBe(false);
  });
});
