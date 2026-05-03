import { describe, it, expect } from 'vitest'

import {
  webBookingPayloadSchema,
  webBookingRiderToDbColumns,
} from '@/actions/booking-schemas'

const minimalBookingBase = {
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
  customer: {
    name: 'Booker',
    email: 'booker@example.com',
    phone: '+27123456789',
  },
}

describe('webBookingRiderSchema (via webBookingPayloadSchema)', () => {
  it('accepts missing rider', () => {
    const r = webBookingPayloadSchema.safeParse(minimalBookingBase)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(webBookingRiderToDbColumns(r.data.rider)).toEqual({
        rider_name: null,
        rider_email: null,
        rider_phone: null,
      })
    }
  })

  it('accepts valid rider and maps to DB columns', () => {
    const r = webBookingPayloadSchema.safeParse({
      ...minimalBookingBase,
      rider: {
        name: 'Rider One',
        email: 'rider@example.com',
        phone: '+27987654321',
      },
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(webBookingRiderToDbColumns(r.data.rider)).toEqual({
        rider_name: 'Rider One',
        rider_email: 'rider@example.com',
        rider_phone: '+27987654321',
      })
    }
  })

  it('rejects bad rider email when rider fields are used', () => {
    const r = webBookingPayloadSchema.safeParse({
      ...minimalBookingBase,
      rider: { name: 'X', email: 'not-email', phone: '' },
    })
    expect(r.success).toBe(false)
  })

  it('rejects bad rider ZA phone', () => {
    const r = webBookingPayloadSchema.safeParse({
      ...minimalBookingBase,
      rider: { name: '', email: '', phone: '123' },
    })
    expect(r.success).toBe(false)
  })
})

describe('webBookingRiderToDbColumns', () => {
  it('returns nulls for blank-only rider object', () => {
    expect(
      webBookingRiderToDbColumns({
        name: '  ',
        email: '',
        phone: '',
      }),
    ).toEqual({ rider_name: null, rider_email: null, rider_phone: null })
  })
})
