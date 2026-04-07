import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateExperienceQuote } from '@/actions/calculateExperienceQuote'

const fetchExperiencePackageById = vi.fn()
const resolveExperiencePackageVehicleCategoryId = vi.fn()
const experiencePackageStubLocations = vi.fn()
const fetchVehicleTypeById = vi.fn()

vi.mock('@/lib/experience-package-data', () => ({
  fetchExperiencePackageById: (...args: unknown[]) =>
    fetchExperiencePackageById(...args),
  resolveExperiencePackageVehicleCategoryId: (...args: unknown[]) =>
    resolveExperiencePackageVehicleCategoryId(...args),
  experiencePackageStubLocations: (...args: unknown[]) =>
    experiencePackageStubLocations(...args),
}))

vi.mock('@/lib/pricing-data', () => ({
  fetchVehicleTypeById: (...args: unknown[]) => fetchVehicleTypeById(...args),
}))

const PKG_ID = 'e0000001-0000-4000-8000-000000000001'
const VC_ID = 'v0000001-0000-4000-8000-000000000001'

const stubOrigin = {
  placeId: 'exp-origin',
  formattedAddress: 'Cape Town CBD',
  name: 'Pickup',
  latitude: -33.9,
  longitude: 18.42,
}
const stubDestination = {
  placeId: 'exp-dest',
  formattedAddress: 'Stellenbosch',
  name: 'Winelands',
  latitude: -33.93,
  longitude: 18.86,
}

describe('calculateExperienceQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchExperiencePackageById.mockResolvedValue({
      id: PKG_ID,
      slug: 'cape-winelands-day',
      title: 'Cape Winelands day',
      description: null,
      base_price_zar: 4500,
      per_passenger_increment_zar: 200,
      included_passengers: 2,
      default_vehicle_category_id: VC_ID,
      itinerary: [],
      addon_catalog: [
        { id: 'addon-champagne', label: 'Champagne', price_zar: 350 },
      ],
      stub_origin: stubOrigin,
      stub_destination: stubDestination,
      estimated_duration_minutes: 480,
      is_active: true,
    })
    resolveExperiencePackageVehicleCategoryId.mockResolvedValue(VC_ID)
    experiencePackageStubLocations.mockReturnValue({
      origin: stubOrigin,
      destination: stubDestination,
    })
    fetchVehicleTypeById.mockResolvedValue({
      id: VC_ID,
      name: 'Premium MPV',
      price_multiplier: 1,
      passenger_capacity: 6,
      luggage_capacity: 4,
      image_url: null,
    })
  })

  it('returns success with line items and vehicle option', async () => {
    const res = await calculateExperienceQuote({
      packageId: PKG_ID,
      date: new Date('2026-06-15T10:00:00.000Z'),
      groupSize: 3,
      selectedAddonIds: ['addon-champagne'],
    })

    expect(res.success).toBe(true)
    if (!res.success) {
      return
    }
    expect(res.data.packageSlug).toBe('cape-winelands-day')
    expect(res.data.totalZar).toBeGreaterThan(0)
    expect(res.data.lineItems.length).toBeGreaterThanOrEqual(2)
    expect(res.data.vehicleOptions).toHaveLength(1)
    expect(res.data.vehicleOptions[0].id).toBe(VC_ID)
    expect(res.data.stubOrigin.placeId).toBe('exp-origin')
    expect(fetchExperiencePackageById).toHaveBeenCalledWith(PKG_ID)
    expect(fetchVehicleTypeById).toHaveBeenCalledWith(VC_ID)
  })

  it('returns error when package is missing', async () => {
    fetchExperiencePackageById.mockResolvedValueOnce(null)
    const res = await calculateExperienceQuote({
      packageId: PKG_ID,
      date: new Date(),
      groupSize: 2,
      selectedAddonIds: [],
    })
    expect(res.success).toBe(false)
    if (res.success) {
      return
    }
    expect(res.error).toMatch(/not available/i)
  })

  it('returns error on invalid Zod input', async () => {
    const res = await calculateExperienceQuote({
      packageId: 'not-a-uuid',
      date: new Date(),
      groupSize: 2,
    })
    expect(res.success).toBe(false)
    if (res.success) {
      return
    }
    expect(res.error).toMatch(/invalid/i)
  })
})
