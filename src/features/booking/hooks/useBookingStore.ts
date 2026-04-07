'use client';

import { create } from 'zustand';
import type { BookingIntent } from '@/lib/booking-quote-types';

/**
 * Location type from Google Maps Places API
 */
export interface Location {
  placeId: string;
  formattedAddress: string;
  name: string;
  latitude: number;
  longitude: number;
  isAirport?: boolean;
}

/**
 * Booking state interface for the Zustand store
 * Persists user inputs across the multi-step booking flow
 */
export interface BookingState {
  // Step 1: Search
  origin: Location | null;
  destination: Location | null;
  date: Date | null;
  passengers: number;
  flightNumber: string | null;
  bookingIntent: BookingIntent;
  hourlyDurationHours: number | null;
  hourlyServiceAreaNotes: string | null;
  hourlyBillableHours: number | null;

  /** VST-10 experience packages */
  experiencePackageId: string | null;
  experienceAddonIds: string[];

  // Step 2: Quote
  selectedVehicleId: string | null;
  quoteAmount: number | null;
  estimatedDuration: number | null; // in minutes
  distance: number | null; // in kilometers
  vehicleOptions: Array<{
    id: string;
    name: string;
    capacity: number;
    price: number;
    luggageCapacity?: string;
    imageUrl?: string;
  }> | null;

  // Step 3: Details
  customer: {
    name: string;
    email: string;
    phone: string;
  } | null;

  // Step 4: Payment
  bookingId: string | null;
  paymentStatus: 'pending' | 'processing' | 'success' | 'failed' | null;

  // Actions
  setTripDetails: (details: Partial<Pick<BookingState, 'origin' | 'destination' | 'date' | 'passengers' | 'flightNumber'>>) => void;
  setBookingProduct: (
    details: Partial<
      Pick<
        BookingState,
        | 'bookingIntent'
        | 'hourlyDurationHours'
        | 'hourlyServiceAreaNotes'
        | 'hourlyBillableHours'
        | 'experiencePackageId'
        | 'experienceAddonIds'
      >
    >
  ) => void;
  selectVehicle: (vehicleId: string, amount: number) => void;
  setQuoteDetails: (details: Partial<Pick<BookingState, 'quoteAmount' | 'estimatedDuration' | 'distance' | 'vehicleOptions'>>) => void;
  setCustomerDetails: (customer: BookingState['customer']) => void;
  setBookingId: (bookingId: string | null) => void;
  setPaymentStatus: (status: BookingState['paymentStatus']) => void;
  reset: () => void;
}

const initialState = {
  origin: null,
  destination: null,
  date: null,
  passengers: 1,
  flightNumber: null,
  bookingIntent: 'point_to_point' as BookingIntent,
  hourlyDurationHours: null,
  hourlyServiceAreaNotes: null,
  hourlyBillableHours: null,
  experiencePackageId: null,
  experienceAddonIds: [],
  selectedVehicleId: null,
  quoteAmount: null,
  estimatedDuration: null,
  distance: null,
  vehicleOptions: null,
  customer: null,
  bookingId: null,
  paymentStatus: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,

  setTripDetails: (details) =>
    set((state) => ({
      ...state,
      ...details,
    })),

  setBookingProduct: (details) =>
    set((state) => ({
      ...state,
      ...details,
    })),

  selectVehicle: (vehicleId, amount) =>
    set((state) => ({
      ...state,
      selectedVehicleId: vehicleId,
      quoteAmount: amount,
    })),

  setQuoteDetails: (details) =>
    set((state) => ({
      ...state,
      ...details,
    })),

  setCustomerDetails: (customer) =>
    set((state) => ({
      ...state,
      customer,
    })),

  setBookingId: (bookingId) =>
    set((state) => ({
      ...state,
      bookingId,
    })),

  setPaymentStatus: (paymentStatus) =>
    set((state) => ({
      ...state,
      paymentStatus,
    })),

  reset: () => set(initialState),
}));

