'use server';

import { z } from 'zod';
import { calculateHourlyHirePrice } from '@/lib/calculations';
import { fetchActiveVehicleTypes } from '@/lib/pricing-data';
import type { QuoteVehicleOption } from '@/lib/booking-quote-types';
import { quoteLocationSchema } from '@/actions/booking-schemas';
import { getPricingHourlyMinimumHours } from '@/lib/pricing-env';

const hourlyQuoteSchema = z.object({
  pickup: quoteLocationSchema,
  date: z.coerce.date(),
  passengers: z.number().min(1).max(20),
  durationHours: z.number().min(0.5).max(72),
  serviceAreaNotes: z.string().max(2000).optional(),
});

export type HourlyQuoteParams = z.infer<typeof hourlyQuoteSchema>;

export type HourlyQuoteResult = {
  vehicleOptions: QuoteVehicleOption[];
  billableHours: number;
  routeDetails: {
    origin: string;
    destinationLabel: string;
  };
};

/**
 * Hourly / dedicated chauffeur hire quote — no distance matrix; server-authoritative pricing.
 */
export async function calculateHourlyQuote(
  params: HourlyQuoteParams
): Promise<
  { success: true; data: HourlyQuoteResult } | { success: false; error: string }
> {
  try {
    const validated = hourlyQuoteSchema.parse(params);
    const vehicleTypes = await fetchActiveVehicleTypes();

    if (vehicleTypes.length === 0) {
      return {
        success: false,
        error: 'No vehicle types available. Please contact support.',
      };
    }

    const options: QuoteVehicleOption[] = await Promise.all(
      vehicleTypes
        .filter((vt) => vt.passenger_capacity >= validated.passengers)
        .map(async (vt) => {
          const priceResult = await calculateHourlyHirePrice({
            vehicle_type_id: vt.id,
            pickup_datetime: validated.date,
            duration_hours: validated.durationHours,
          });
          return {
            id: vt.id,
            name: vt.name,
            capacity: vt.passenger_capacity,
            price: Math.round(priceResult.final_price * 100) / 100,
            luggageCapacity: vt.luggage_capacity
              ? String(vt.luggage_capacity)
              : undefined,
            imageUrl: vt.image_url || undefined,
          };
        })
    );

    if (options.length === 0) {
      return {
        success: false,
        error: `No vehicles available for ${validated.passengers} passenger(s).`,
      };
    }

    options.sort((a, b) => a.price - b.price);

    const billableHours = Math.max(
      validated.durationHours,
      getPricingHourlyMinimumHours()
    );

    return {
      success: true,
      data: {
        vehicleOptions: options,
        billableHours,
        routeDetails: {
          origin: validated.pickup.formattedAddress,
          destinationLabel: 'As directed (hourly chauffeur hire)',
        },
      },
    };
  } catch (error) {
    console.error('Error calculating hourly quote:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid hourly hire details. Please check your inputs.',
      };
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message || 'Unable to calculate hourly quote.',
      };
    }
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
