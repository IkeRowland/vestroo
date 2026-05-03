import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBooking } from '../createBooking';

vi.mock('@/lib/booking-quote-reconcile', () => ({
  reconcileBookingQuote: vi.fn().mockResolvedValue({
    serverTotalZar: 199.5,
    distanceKm: 12,
    estimatedDurationMinutes: 18,
  }),
}));

vi.mock('@/actions/booking-client-type-enrich', () => ({
  enrichWebBookingWithClientType: vi.fn().mockResolvedValue({
    client_type: 'walk_in',
    customer_account_id: null,
    account_snapshot: null,
    booking_metadata: { client_type_source: 'no_match' },
  }),
}));

vi.mock('@/services/sms', () => ({
  notifyBookingCreatedSms: vi.fn().mockResolvedValue(undefined),
}));

const singleMock = vi.fn().mockResolvedValue({
  data: {
    id: 'b1111111-1111-4111-8111-111111111111',
    payment_reference: 'VST-12345678',
  },
  error: null,
});

const insertMock = vi.fn(() => ({
  select: vi.fn(() => ({
    single: singleMock,
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === 'customer_accounts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { name: 'Example Corp', default_po_required: false },
            error: null,
          }),
        }
      }
      return {
        insert: insertMock,
      }
    }),
  }),
}));

describe('createBooking', () => {
  const prevQf = process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS

  beforeEach(() => {
    vi.clearAllMocks();
    if (prevQf === undefined) {
      delete process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS
    } else {
      process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS = prevQf
    }
  });

  it('reconciles quote and inserts with server total', async () => {
    const payload = {
      bookingIntent: 'point_to_point' as const,
      origin: {
        placeId: 'a',
        formattedAddress: 'A St',
        name: 'A',
        latitude: -26,
        longitude: 28,
      },
      destination: {
        placeId: 'b',
        formattedAddress: 'B St',
        name: 'B',
        latitude: -26.1,
        longitude: 28.1,
      },
      date: new Date('2026-06-01T09:00:00Z'),
      passengers: 2,
      flightNumber: null,
      selectedVehicleId: '1',
      quoteAmount: 199.5,
      estimatedDuration: 18,
      distance: 12,
      customer: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+27123456789',
      },
    };

    const result = await createBooking(payload);
    expect(result.success).toBe(true);
    expect(singleMock).toHaveBeenCalled();
    const inserted = insertMock.mock.calls[0][0] as { status: string }
    expect(inserted.status).toBe('pending');
  });

  it('14.7: hourly_hire uses submitted when quote-first is ON (default)', async () => {
    const payload = {
      bookingIntent: 'hourly_hire' as const,
      origin: {
        placeId: 'a',
        formattedAddress: 'A St',
        name: 'A',
        latitude: -26,
        longitude: 28,
      },
      destination: null,
      date: new Date('2026-06-01T09:00:00Z'),
      passengers: 2,
      flightNumber: null,
      selectedVehicleId: '1',
      quoteAmount: 199.5,
      estimatedDuration: 18,
      distance: 12,
      hourlyDurationHours: 3,
      customer: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+27123456789',
      },
    };
    delete process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS
    const result = await createBooking(payload);
    expect(result.success).toBe(true);
    const inserted = insertMock.mock.calls[0][0] as { status: string }
    expect(inserted.status).toBe('submitted');
  });

  it('14.7: hourly_hire stays pending when quote-first is OFF', async () => {
    process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS = 'false'
    const payload = {
      bookingIntent: 'hourly_hire' as const,
      origin: {
        placeId: 'a',
        formattedAddress: 'A St',
        name: 'A',
        latitude: -26,
        longitude: 28,
      },
      destination: null,
      date: new Date('2026-06-01T09:00:00Z'),
      passengers: 2,
      flightNumber: null,
      selectedVehicleId: '1',
      quoteAmount: 199.5,
      estimatedDuration: 18,
      distance: 12,
      hourlyDurationHours: 3,
      customer: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+27123456789',
      },
    };
    const result = await createBooking(payload);
    expect(result.success).toBe(true);
    const inserted = insertMock.mock.calls[0][0] as { status: string }
    expect(inserted.status).toBe('pending');
  });
});
