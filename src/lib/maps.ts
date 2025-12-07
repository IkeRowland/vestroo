/**
 * Google Maps API utilities
 * Handles Places Autocomplete and Distance Matrix API calls
 */

export interface PlaceResult {
  place_id: string;
  formatted_address: string;
  name: string;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  types: string[];
}

export interface DistanceMatrixResult {
  distance: {
    value: number; // in meters
    text: string;
  };
  duration: {
    value: number; // in seconds
    text: string;
  };
  status: string;
}

export interface DistanceMatrixResponse {
  rows: Array<{
    elements: DistanceMatrixResult[];
  }>;
  status: string;
}

/**
 * Check if a place is an airport based on its types
 */
export function isAirport(place: PlaceResult): boolean {
  const airportTypes = ['airport', 'establishment'];
  return place.types.some((type) => airportTypes.includes(type.toLowerCase()));
}

/**
 * Initialize Google Maps Places Autocomplete
 * This is a client-side utility that should be used in components
 */
export function initializePlacesAutocomplete(
  input: HTMLInputElement,
  onPlaceSelect: (place: PlaceResult) => void
): google.maps.places.Autocomplete | null {
  if (typeof window === 'undefined' || !window.google?.maps?.places) {
    console.error('Google Maps API not loaded');
    return null;
  }

  const autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['establishment', 'geocode'],
    fields: ['place_id', 'formatted_address', 'name', 'geometry', 'types'],
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place.geometry && place.geometry.location && place.place_id) {
      // Map Google Maps PlaceResult to our PlaceResult type
      const mappedPlace: PlaceResult = {
        place_id: place.place_id,
        formatted_address: place.formatted_address || '',
        name: place.name || '',
        geometry: {
          location: place.geometry.location,
        },
        types: place.types || [],
      };
      onPlaceSelect(mappedPlace);
    }
  });

  return autocomplete;
}

/**
 * Calculate distance and duration between two locations using Distance Matrix API
 * This should be called server-side
 * 
 * @param origin - Origin location (can use placeId or coordinates)
 * @param destination - Destination location (can use placeId or coordinates)
 * @param apiKey - Google Maps API key
 */
export async function calculateRouteDistance(
  origin: { lat: number; lng: number; placeId?: string },
  destination: { lat: number; lng: number; placeId?: string },
  apiKey: string
): Promise<{ distance: number; duration: number; status: string }> {
  // Prefer place_id over coordinates for better accuracy
  // When using place_id, must prefix with "place_id:"
  const originStr = origin.placeId ? `place_id:${origin.placeId}` : `${origin.lat},${origin.lng}`;
  const destStr = destination.placeId ? `place_id:${destination.placeId}` : `${destination.lat},${destination.lng}`;

  // Add mode=driving to ensure we get road routes, and avoid=ferries for better results
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destStr)}&key=${apiKey}&units=metric&mode=driving&avoid=ferries`;

  try {
    console.log('[Distance Matrix] Request:', {
      origin: { 
        lat: origin.lat, 
        lng: origin.lng,
        placeId: origin.placeId,
        formatted: originStr,
      },
      destination: { 
        lat: destination.lat, 
        lng: destination.lng,
        placeId: destination.placeId,
        formatted: destStr,
      },
    });

    const response = await fetch(url);
    const data: DistanceMatrixResponse = await response.json();

    console.log('[Distance Matrix] Response:', {
      status: data.status,
      elementStatus: data.rows[0]?.elements[0]?.status,
      fullResponse: JSON.stringify(data, null, 2),
    });

    if (data.status !== 'OK' || !data.rows[0]?.elements[0]) {
      // Provide user-friendly error messages based on API status
      const errorMessages: Record<string, string> = {
        INVALID_REQUEST: 'Invalid request. Please check your pickup and dropoff locations.',
        MAX_ELEMENTS_EXCEEDED: 'Request too large. Please contact support.',
        OVER_QUERY_LIMIT: 'Service temporarily unavailable. Please try again later.',
        REQUEST_DENIED: 'Request denied. Please check your API configuration.',
        UNKNOWN_ERROR: 'An unknown error occurred. Please try again.',
      };
      
      const errorMessage = errorMessages[data.status] || `Distance Matrix API error: ${data.status}`;
      throw new Error(errorMessage);
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      // Provide user-friendly error messages based on element status
      const elementErrorMessages: Record<string, string> = {
        NOT_FOUND: 'One or both locations could not be found. Please verify your addresses.',
        ZERO_RESULTS: 'No route found between the selected locations. Please check that both locations are valid and accessible by road.',
        MAX_ROUTE_LENGTH_EXCEEDED: 'The route is too long. Please select locations closer together.',
      };
      
      const errorMessage = elementErrorMessages[element.status] || `Unable to calculate route: ${element.status}`;
      throw new Error(errorMessage);
    }

    return {
      distance: element.distance.value / 1000, // Convert meters to kilometers
      duration: element.duration.value / 60, // Convert seconds to minutes
      status: element.status,
    };
  } catch (error) {
    console.error('Error calculating route distance:', error);
    throw error;
  }
}

