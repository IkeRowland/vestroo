import { describe, it, expect } from 'vitest'
import { webBookingPayloadSchema } from '@/actions/booking-schemas'

const basePayload = {
  origin: {
    placeId: 'o1',
    formattedAddress: 'Origin',
    name: 'Origin',
    latitude: -33,
    longitude: 18,
  },
  destination: {
    placeId: 'd1',
    formattedAddress: 'Dest',
    name: 'Dest',
    latitude: -34,
    longitude: 19,
  },
  date: new Date('2026-06-15T08:00:00.000Z'),
  passengers: 3,
  flightNumber: null,
  selectedVehicleId: '11111111-1111-4111-8111-111111111111',
  quoteAmount: 5000,
  estimatedDuration: null,
  distance: null,
  customer: {
    name: 'A',
    email: 'a@example.com',
    phone: '+27000000000',
  },
}

describe('webBookingPayloadSchema experience_package', () => {
  it('accepts experience flow without point-to-point destination requirement', () => {
    const parsed = webBookingPayloadSchema.parse({
      ...basePayload,
      bookingIntent: 'experience_package',
      destination: undefined,
      bookingMetadata: {
        experience_package_id: 'e0000001-0000-4000-8000-000000000001',
        experience_date: '2026-06-15T08:00:00.000Z',
        group_size: 3,
        selected_addon_ids: ['addon-champagne'],
      },
    })
    expect(parsed.bookingIntent).toBe('experience_package')
    expect(parsed.destination).toBeUndefined()
  })

  it('rejects when group_size does not match passengers', () => {
    expect(() =>
      webBookingPayloadSchema.parse({
        ...basePayload,
        passengers: 2,
        bookingIntent: 'experience_package',
        bookingMetadata: {
          experience_package_id: 'e0000001-0000-4000-8000-000000000001',
          experience_date: '2026-06-15T08:00:00.000Z',
          group_size: 3,
          selected_addon_ids: [],
        },
      })
    ).toThrow()
  })

  it('rejects when experience date day mismatches trip date', () => {
    expect(() =>
      webBookingPayloadSchema.parse({
        ...basePayload,
        bookingIntent: 'experience_package',
        bookingMetadata: {
          experience_package_id: 'e0000001-0000-4000-8000-000000000001',
          experience_date: '2026-06-16T08:00:00.000Z',
          group_size: 3,
          selected_addon_ids: [],
        },
      })
    ).toThrow(/Experience date must match/)
  })
})
