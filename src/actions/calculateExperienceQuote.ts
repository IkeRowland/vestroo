'use server'

import { z } from 'zod'
import { computeExperiencePackageQuote, parseAddonCatalog } from '@/lib/experience-package-quote'
import {
  fetchExperiencePackageById,
  resolveExperiencePackageVehicleCategoryId,
  experiencePackageStubLocations,
} from '@/lib/experience-package-data'
import { fetchVehicleTypeById } from '@/lib/pricing-data'
import type { QuoteVehicleOption } from '@/lib/booking-quote-types'

const experienceQuoteInputSchema = z.object({
  packageId: z.string().uuid(),
  date: z.coerce.date(),
  groupSize: z.number().int().min(1).max(20),
  selectedAddonIds: z.array(z.string().min(1)).default([]),
})

export type ExperienceQuoteLineItem = {
  code: string
  label: string
  amount_zar: number
}

export type CalculateExperienceQuoteResult = {
  packageTitle: string
  packageSlug: string
  lineItems: ExperienceQuoteLineItem[]
  totalZar: number
  vehicleOptions: QuoteVehicleOption[]
  estimatedDurationMinutes: number | null
  stubOrigin: ReturnType<typeof experiencePackageStubLocations>['origin']
  stubDestination: ReturnType<typeof experiencePackageStubLocations>['destination']
}

/**
 * Server-side quote for experience_package intent (no Maps).
 */
export async function calculateExperienceQuote(
  input: unknown
): Promise<
  | { success: true; data: CalculateExperienceQuoteResult }
  | { success: false; error: string }
> {
  try {
    const parsed = experienceQuoteInputSchema.parse(input)
    // Reserved for future date-based pricing rules; validated for consistent wizard state.
    void parsed.date
    const pkg = await fetchExperiencePackageById(parsed.packageId)
    if (!pkg) {
      return { success: false, error: 'This experience is not available.' }
    }

    const addons = parseAddonCatalog(pkg.addon_catalog)
    const { lineItems, total_zar } = computeExperiencePackageQuote(
      {
        base_price_zar: pkg.base_price_zar,
        per_passenger_increment_zar: pkg.per_passenger_increment_zar,
        included_passengers: pkg.included_passengers,
        addon_catalog: addons,
      },
      parsed.groupSize,
      parsed.selectedAddonIds
    )

    const vehicleCategoryId = await resolveExperiencePackageVehicleCategoryId(
      pkg,
      parsed.groupSize
    )
    const vt = await fetchVehicleTypeById(vehicleCategoryId)
    if (!vt) {
      return {
        success: false,
        error: 'Vehicle tier for this package is unavailable.',
      }
    }

    const vehicleOptions: QuoteVehicleOption[] = [
      {
        id: vehicleCategoryId,
        name: `${pkg.title} — ${vt.name}`,
        capacity: vt.passenger_capacity,
        price: total_zar,
        luggageCapacity: vt.luggage_capacity
          ? String(vt.luggage_capacity)
          : undefined,
        imageUrl: vt.image_url || undefined,
      },
    ]

    const { origin, destination } = experiencePackageStubLocations(pkg)

    return {
      success: true,
      data: {
        packageTitle: pkg.title,
        packageSlug: pkg.slug,
        lineItems,
        totalZar: total_zar,
        vehicleOptions,
        estimatedDurationMinutes: pkg.estimated_duration_minutes,
        stubOrigin: origin,
        stubDestination: destination,
      },
    }
  } catch (error) {
    console.error('calculateExperienceQuote:', error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid experience booking details.',
      }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Unable to calculate experience quote.' }
  }
}
