import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBooking } from '../createBooking';

vi.mock('@/lib/booking-quote-reconcile', () => ({
  reconcileBookingQuote: vi.fn().mockResolvedValue({
    serverTotalZar: 199.5,
    distanceKm: 12,
    estimatedDurationMinutes: 18,
  }),
}));

vi.mock('@/services/sms-stub', () => ({
  notifyBookingCreatedSmsStub: vi.fn().mockResolvedValue(undefined),
}));

const singleMock = vi.fn().mockResolvedValue({
  data: {
    id: 'b1111111-1111-4111-8111-111111111111',
    payment_reference: 'VST-12345678',
  },
  error: null,
});

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: singleMock,
        })),
      })),
    })),
  }),
}));

describe('createBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });
});
