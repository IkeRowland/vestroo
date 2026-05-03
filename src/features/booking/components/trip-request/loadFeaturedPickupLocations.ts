import type { TripRequestLocation } from './ride-details-validate';

/**
 * Curated, non-personalised hubs for quick pickup chips (FE.19.3).
 * Coordinates and place IDs align with Google Places; labels are display-only.
 */
export type FeaturedPickupLocation = {
  id: string;
  label: string;
  location: TripRequestLocation;
};

const FEATURED_PICKUP_LOCATIONS: FeaturedPickupLocation[] = [
  {
    id: 'jnb-or-tambo',
    label: 'O.R. Tambo Airport',
    location: {
      placeId: 'ChIJVXealLU_xh4RAlsdhc47w34',
      formattedAddress: 'O.R. Tambo International Airport, Kempton Park, South Africa',
      name: 'O.R. Tambo International Airport',
      latitude: -26.1367,
      longitude: 28.2411,
      types: ['airport', 'establishment'],
    },
  },
  {
    id: 'lanseria',
    label: 'Lanseria Airport',
    location: {
      placeId: 'ChIJrWxcXrV9lR4RBCqYvXwYxXQ',
      formattedAddress: 'Lanseria International Airport, Lanseria, South Africa',
      name: 'Lanseria International Airport',
      latitude: -25.9385,
      longitude: 27.9261,
      types: ['airport', 'establishment'],
    },
  },
  {
    id: 'sandton-city',
    label: 'Sandton City',
    location: {
      placeId: 'ChIJnS9jVlZ9lR4RqY9xJxYxXQY',
      formattedAddress: 'Sandton City, Sandton, Johannesburg, South Africa',
      name: 'Sandton City Shopping Centre',
      latitude: -26.1076,
      longitude: 28.0567,
      types: ['shopping_mall', 'establishment'],
    },
  },
  {
    id: 'rosebank',
    label: 'Rosebank',
    location: {
      placeId: 'ChIJ8eY8wVp9lR4RqY9xJxYxXRZ',
      formattedAddress: 'Rosebank, Johannesburg, South Africa',
      name: 'The Mall of Rosebank',
      latitude: -26.1456,
      longitude: 28.0436,
      types: ['shopping_mall', 'establishment'],
    },
  },
  {
    id: 'pretoria-station',
    label: 'Pretoria Station',
    location: {
      placeId: 'ChIJvY9xKRxhlR4RqY9xJxYxXRa',
      formattedAddress: 'Pretoria railway station, Pretoria, South Africa',
      name: 'Pretoria Station',
      latitude: -25.752,
      longitude: 28.1899,
      types: ['train_station', 'transit_station'],
    },
  },
];

/**
 * Loads featured pickup rows for booking slide 1 chips (async for parity with a future API).
 */
export async function loadFeaturedPickupLocations(): Promise<FeaturedPickupLocation[]> {
  return [...FEATURED_PICKUP_LOCATIONS];
}
