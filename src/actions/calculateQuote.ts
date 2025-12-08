'use server';

import { z } from 'zod';
import { getPayload } from 'payload';
import config from '@payload-config';
import { calculateRouteDistance } from '@/lib/maps';
import { calculatePrice, type PriceCalculationInput } from '@/lib/calculations';

/**
 * Search parameters for quote calculation
 */
export interface SearchParams {
  origin: {
    placeId: string;
    formattedAddress: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  destination: {
    placeId: string;
    formattedAddress: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  date: Date;
  passengers: number;
  flightNumber?: string;
}

/**
 * Quote result interface
 */
export interface QuoteResult {
  price: number;
  basePrice: number;
  distance: number; // in kilometers
  estimatedDuration: number; // in minutes
  vehicleOptions: Array<{
    id: string;
    name: string;
    capacity: number;
    price: number;
    luggageCapacity?: string;
    imageUrl?: string;
  }>;
  routeDetails: {
    origin: string;
    destination: string;
  };
}

/**
 * Validation schema for search parameters
 */
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
  date: z.date(),
  passengers: z.number().min(1).max(20),
  flightNumber: z.string().optional(),
});

/**
 * Find route by origin and destination names
 * Uses case-insensitive matching and tries multiple matching strategies
 */
async function findRouteByNames(
  originName: string,
  destinationName: string
): Promise<{ id: string; base_price: number } | null> {
  try {
    const payload = await getPayload({ config });
    
    console.log('[Route Lookup] Searching for route:', {
      originName,
      destinationName,
    });
    
    // First try exact match (case-insensitive)
    const routesResult = await payload.find({
      collection: 'routes',
      where: {
        and: [
          {
            origin_name: {
              equals: originName,
            },
          },
          {
            destination_name: {
              equals: destinationName,
            },
          },
          {
            is_active: {
              equals: true,
            },
          },
        ],
      },
      limit: 1,
    });

    // If no exact match, try case-insensitive contains matching
    if (routesResult.docs.length === 0) {
      console.log('[Route Lookup] Exact match failed, trying case-insensitive contains...');
      
      // Get all active routes to do flexible matching
      const allRoutesResult = await payload.find({
        collection: 'routes',
        where: {
          is_active: {
            equals: true,
          },
        },
        limit: 100,
      });

      // Find route where origin and destination names contain the search terms (case-insensitive)
      const matchedRoute = allRoutesResult.docs.find((route) => {
        const originMatch = route.origin_name?.toLowerCase().includes(originName.toLowerCase()) ||
                           originName.toLowerCase().includes(route.origin_name?.toLowerCase() || '');
        const destMatch = route.destination_name?.toLowerCase().includes(destinationName.toLowerCase()) ||
                         destinationName.toLowerCase().includes(route.destination_name?.toLowerCase() || '');
        return originMatch && destMatch;
      });

      if (matchedRoute) {
        console.log('[Route Lookup] Found route via flexible matching:', {
          routeId: matchedRoute.id,
          origin: matchedRoute.origin_name,
          destination: matchedRoute.destination_name,
        });
        return {
          id: String(matchedRoute.id),
          base_price: matchedRoute.base_price || 0,
        };
      }

      // No route found - log available routes for debugging
      console.log('[Route Lookup] No route found. Available routes:', 
        allRoutesResult.docs.map(r => ({ 
          id: r.id, 
          origin: r.origin_name, 
          destination: r.destination_name 
        }))
      );
      return null;
    } else {
      console.log('[Route Lookup] Found route via exact match:', {
        routeId: routesResult.docs[0].id,
        origin: routesResult.docs[0].origin_name,
        destination: routesResult.docs[0].destination_name,
      });
    }

    const route = routesResult.docs[0];
    return {
      id: String(route.id),
      base_price: route.base_price || 0,
    };
  } catch (error) {
    console.error('Error finding route:', error);
    return null;
  }
}

/**
 * Fetch all active vehicle types from PayloadCMS
 */
async function getActiveVehicleTypes(): Promise<Array<{
  id: string;
  name: string;
  price_multiplier: number;
  passenger_capacity: number;
  luggage_capacity: number;
  image_url?: string;
}>> {
  try {
    const payload = await getPayload({ config });
    
    const vehicleTypesResult = await payload.find({
      collection: 'vehicle-types',
      where: {
        is_active: {
          equals: true,
        },
      },
      limit: 100,
    });

    return vehicleTypesResult.docs.map((vt) => ({
      id: String(vt.id),
      name: vt.name,
      price_multiplier: vt.price_multiplier,
      passenger_capacity: vt.passenger_capacity,
      luggage_capacity: vt.luggage_capacity,
      image_url: vt.image_url || undefined,
    }));
  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    return [];
  }
}

/**
 * Calculate quote based on route and passenger count
 * Server Action for quote calculation
 */
export async function calculateQuote(
  params: SearchParams
): Promise<{ success: true; data: QuoteResult } | { success: false; error: string }> {
  try {
    // Validate input
    const validatedParams = searchParamsSchema.parse(params);

    // Get Google Maps API key from environment
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'Google Maps API key not configured',
      };
    }

    // Calculate route distance and duration using Google Maps Distance Matrix API
    // Use place_id if available for better accuracy
    const routeInfo = await calculateRouteDistance(
      {
        lat: validatedParams.origin.latitude,
        lng: validatedParams.origin.longitude,
        placeId: validatedParams.origin.placeId,
      },
      {
        lat: validatedParams.destination.latitude,
        lng: validatedParams.destination.longitude,
        placeId: validatedParams.destination.placeId,
      },
      apiKey
    );

    if (routeInfo.status !== 'OK') {
      return {
        success: false,
        error: 'Unable to calculate route. Please check your locations.',
      };
    }

    // Fetch active vehicle types
    const vehicleTypes = await getActiveVehicleTypes();

    if (vehicleTypes.length === 0) {
      return {
        success: false,
        error: 'No vehicle types available. Please contact support.',
      };
    }

    // Get base price per kilometer from environment or use default
    // You can set this in .env as PRICING_BASE_PRICE_PER_KM (e.g., 15 for R15/km)
    const basePricePerKm = parseFloat(process.env.PRICING_BASE_PRICE_PER_KM || '15');

    // Calculate price for each vehicle type using distance-based pricing
    const vehicleOptions = await Promise.all(
      vehicleTypes
        .filter((vt) => vt.passenger_capacity >= validatedParams.passengers)
        .map(async (vt) => {
          try {
            const priceResult = await calculatePrice({
              vehicle_type_id: vt.id,
              pickup_datetime: validatedParams.date,
              passenger_count: validatedParams.passengers,
              distance_km: routeInfo.distance,
              base_price_per_km: basePricePerKm,
            });

            return {
              id: vt.id,
              name: vt.name,
              capacity: vt.passenger_capacity,
              price: Math.round(priceResult.final_price * 100) / 100, // Round to 2 decimal places
              luggageCapacity: vt.luggage_capacity ? String(vt.luggage_capacity) : undefined,
              imageUrl: vt.image_url || undefined,
            };
          } catch (error) {
            console.error(`Error calculating price for vehicle type ${vt.id}:`, error);
            // Fallback to simple distance-based calculation if pricing calculation fails
            const fallbackPrice = routeInfo.distance * basePricePerKm * vt.price_multiplier;
            return {
              id: vt.id,
              name: vt.name,
              capacity: vt.passenger_capacity,
              price: Math.round(fallbackPrice * 100) / 100,
              luggageCapacity: vt.luggage_capacity ? String(vt.luggage_capacity) : undefined,
              imageUrl: vt.image_url || undefined,
            };
          }
        })
    );

    if (vehicleOptions.length === 0) {
      return {
        success: false,
        error: `No vehicles available for ${validatedParams.passengers} passenger(s). Please select fewer passengers or contact support.`,
      };
    }

    // Sort by price (ascending)
    vehicleOptions.sort((a, b) => a.price - b.price);

    const finalPrice = vehicleOptions[0]?.price || 0;
    const basePrice = routeInfo.distance * basePricePerKm;

    const quote: QuoteResult = {
      price: finalPrice,
      basePrice: basePrice,
      distance: routeInfo.distance,
      estimatedDuration: routeInfo.duration,
      vehicleOptions,
      routeDetails: {
        origin: validatedParams.origin.formattedAddress,
        destination: validatedParams.destination.formattedAddress,
      },
    };

    return {
      success: true,
      data: quote,
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

