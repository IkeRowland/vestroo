'use client';

import { create } from 'zustand';
import type { BookingIntent } from '@/lib/booking-quote-types';
import type { WebClientTypeResolution } from '@/actions/booking-schemas';

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
  /** Marketing slug for “back” from quote to the tour detail page. */
  experiencePackageSlug: string | null;
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

  /** Epic 15 / 15B.1 — optional rider / passenger-of-record contact (wizard → server submit). */
  riderContact: {
    name: string;
    email: string;
    phone: string;
  } | null;

  // Step 4: Payment
  bookingId: string | null;
  paymentStatus: 'pending' | 'processing' | 'success' | 'failed' | null;

  /** Story 12.5 — Q6; set by `BookingAccountDomainGate`, read on booking submit. */
  clientTypeResolution: WebClientTypeResolution | null;

  /**
   * Story 12.7 — live candidate row context for PO-required UI (matches `customer_accounts.default_po_required`).
   * Cleared when the booker is walk-in or domain gate resets.
   */
  accountInvoicingContext: {
    accountDisplayName: string
    defaultPoRequired: boolean
  } | null
  /** Trimmed on submit; optional for walk-in. */
  purchaseOrderRef: string

  /**
   * Story 15.8 — `trips.service_type` hint from “Book this again” URL; consumed when vehicle lists load
   * (trip-request + `/book/quote`) — not a price or quote id.
   */
  preferredVehicleTypeHint: string | null

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
        | 'experiencePackageSlug'
        | 'experienceAddonIds'
      >
    >
  ) => void;
  selectVehicle: (vehicleId: string, amount: number) => void;
  setQuoteDetails: (details: Partial<Pick<BookingState, 'quoteAmount' | 'estimatedDuration' | 'distance' | 'vehicleOptions'>>) => void;
  setCustomerDetails: (customer: BookingState['customer']) => void;
  setRiderContact: (rider: BookingState['riderContact']) => void;
  setBookingId: (bookingId: string | null) => void;
  setPaymentStatus: (status: BookingState['paymentStatus']) => void;
  setClientTypeResolution: (resolution: WebClientTypeResolution | null) => void;
  setAccountInvoicingContext: (
    ctx: BookingState['accountInvoicingContext'],
  ) => void;
  setPurchaseOrderRef: (value: string) => void;
  setPreferredVehicleTypeHint: (value: string | null) => void;
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
  experiencePackageSlug: null,
  experienceAddonIds: [],
  selectedVehicleId: null,
  quoteAmount: null,
  estimatedDuration: null,
  distance: null,
  vehicleOptions: null,
  customer: null,
  riderContact: null,
  bookingId: null,
  paymentStatus: null,
  clientTypeResolution: null,
  accountInvoicingContext: null,
  purchaseOrderRef: '',
  preferredVehicleTypeHint: null,
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

  setRiderContact: (riderContact) =>
    set((state) => ({
      ...state,
      riderContact,
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

  setClientTypeResolution: (clientTypeResolution) =>
    set((state) => ({
      ...state,
      clientTypeResolution,
    })),

  setAccountInvoicingContext: (accountInvoicingContext) =>
    set((state) => ({
      ...state,
      accountInvoicingContext,
    })),

  setPurchaseOrderRef: (purchaseOrderRef) =>
    set((state) => ({
      ...state,
      purchaseOrderRef,
    })),

  setPreferredVehicleTypeHint: (preferredVehicleTypeHint) =>
    set((state) => ({
      ...state,
      preferredVehicleTypeHint,
    })),

  reset: () => set(initialState),
}));

