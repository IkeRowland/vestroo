'use server';

import { z } from 'zod';
import type {
  PointToPointQuoteResult,
  PointToPointSearchParams,
} from '@/lib/booking-quote-types';
import { computePointToPointQuote } from '@/lib/quote-engine';
import { getGoogleMapsServerApiKey } from '@/lib/maps';

/** @deprecated Use PointToPointSearchParams from @/lib/booking-quote-types */
export type SearchParams = PointToPointSearchParams;

/** @deprecated Use PointToPointQuoteResult from @/lib/booking-quote-types */
export type QuoteResult = PointToPointQuoteResult;

const searchParamsSchema = z.object({
  origin: z.object({
    placeId: z.string().min(1),
    formattedAddress: z.string().min(1),
    name: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
  }),
  destination: z.object({
    placeId: z.string().min(1),
    formattedAddress: z.string().min(1),
    name: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
  }),
  date: z.coerce.date(),
  passengers: z.number().min(1).max(20),
  flightNumber: z.string().optional(),
});

/**
 * Calculate quote based on route and passenger count
 * Server Action for quote calculation
 */
export async function calculateQuote(
  params: PointToPointSearchParams
): Promise<
  { success: true; data: PointToPointQuoteResult } | { success: false; error: string }
> {
  try {
    const validatedParams = searchParamsSchema.parse(params);

    const apiKey = getGoogleMapsServerApiKey();
    if (!apiKey) {
      return {
        success: false,
        error:
          'Google Maps server API key not configured (GOOGLE_MAPS_SERVER_KEY — see docs/environment-vars.md).',
      };
    }

    const computed = await computePointToPointQuote(validatedParams, apiKey);
    if (!computed.ok) {
      return { success: false, error: computed.error };
    }

    return {
      success: true,
      data: computed.data,
    };
  } catch (error) {
    console.error('Error calculating quote:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input data. Please check your selections.',
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message || 'An error occurred while calculating the quote.',
      };
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
