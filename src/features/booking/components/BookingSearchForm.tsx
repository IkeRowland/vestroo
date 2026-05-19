'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookingStore } from '../hooks/useBookingStore';
import { z } from 'zod';
import type { PlaceResult } from '@/lib/maps';
import { isAirport } from '@/lib/maps';
import type { SearchParams } from '@/actions/calculateQuote';
import { calculateHourlyQuote } from '@/actions/calculateHourlyQuote';
import { searchBooking, type BookingSearchResult } from '@/actions/searchBooking';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  rideDetailsFromMarketingP2P,
  saveTripRequestPrefill,
} from '@/features/booking/components/trip-request/trip-request-prefill';
import {
  combineRideDateAndTime,
  defaultRideDetailsFormValues,
  PICKUP_SCHEDULE_LEAD_MESSAGE,
  rideDateTimeIsInPast,
  type RideDetailsFormValues,
} from '@/features/booking/components/trip-request/ride-details-validate';
import { TripRequestBookingShell } from '@/features/booking/components/TripRequestBookingShell';
import { TripRequestPassengerStepper } from '@/features/booking/components/trip-request/TripRequestPassengerStepper';
import { clearBookAgainPortalHandoffCookieAction } from '@/actions/bookAgainPortalHandoff';
import type { WebClientTypeResolution } from '@/actions/booking-schemas';

/** TEMP: Restore Tour bookings (hourly hire) tab + `/tours` promo line — set `true` when re-enabled. */
const SHOW_TOUR_BOOKINGS_IN_BOOKING_SEARCH_FORM = false;

/**
 * Validation schema for booking search form
 */
const searchFormSchema = z.object({
  origin: z.object({
    placeId: z.string(),
    formattedAddress: z.string(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  destination: z.object({
    placeId: z.string(),
    formattedAddress: z.string(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  date: z.date().refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Date must be today or in the future',
  }),
  passengers: z.number().min(1).max(20),
  flightNumber: z.string().optional(),
});

export type SearchFormData = z.infer<typeof searchFormSchema>;

/** Query-string hints for `/book/search` (Story 15.8 + Q17-style trip fields). */
export type BookSearchUrlPrefill = {
  originHint?: string;
  destinationHint?: string;
  passengers?: number;
  intent?: string | null;
  serviceTypeHint?: string | null;
  omitTripDate?: boolean;
};

/** Server-verified portal handoff — must match `loadBookAgainPortalBootstrap` shape. */
export type PortalRebookBootstrap = {
  customerAccountId: string;
  accountDisplayName: string;
  defaultPoRequired: boolean;
  defaultBillingEntityRef: string | null;
  memberEmail: string;
  memberName: string;
};

export type BookingSearchFormProps = {
  /** Used e.g. for nav "LOGIN" → `/book/search?tab=login` */
  initialTab?: 'create-booking' | 'modify-booking';
  /** Story **18.5** `?modify=&lt;ref&gt;` from account — pre-fills the reservation lookup. */
  modifyPrefillRef?: string | null;
  /** Homepage hero card: rust header, “Get a quote”, reference-style tabs */
  variant?: 'default' | 'marketing';
  /** Account portal: tokens/chrome aligned with `/account/*` shell */
  shellTheme?: 'default' | 'marketing' | 'accountPortal';
  bookSearchPrefill?: BookSearchUrlPrefill | null;
  portalRebookBootstrap?: PortalRebookBootstrap | null;
  /** FE.19.2 — server-derived default phone country (ISO2) for embedded trip-request shell. */
  tripRequestPhoneCountryIso2Hint?: string | null;
  /** Quote / modify / cancel routes live under public `/book/*` today. */
  bookingFunnelBasePath?: string;
  /** “Go to booking search” in embedded trip-request dead-ends — portal embed uses `/account/bookings`. */
  tripRequestBookingSearchHref?: string;
  /** Account `/account/bookings` embed: create flow only (no modify tab / no tab chrome). */
  accountBookingsEmbed?: boolean;
  /** Ops `/ops/bookings` embed — staff trip-request create with optional referrer. */
  opsBookingsEmbed?: boolean;
  opsReferrerId?: string | null;
  onOpsSubmitSuccess?: () => void;
};

/**
 * Booking Search Form component
 * Matches the desired UI/UX design with tabs and modern layout
 */
export function BookingSearchForm({
  initialTab = 'create-booking',
  variant = 'default',
  shellTheme = 'default',
  bookSearchPrefill = null,
  modifyPrefillRef = null,
  portalRebookBootstrap = null,
  tripRequestPhoneCountryIso2Hint = null,
  bookingFunnelBasePath = '/book',
  tripRequestBookingSearchHref = '/book/search',
  accountBookingsEmbed = false,
  opsBookingsEmbed = false,
  opsReferrerId = null,
  onOpsSubmitSuccess,
}: BookingSearchFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'create-booking' | 'modify-booking'
  >(initialTab);

  useEffect(() => {
    if (accountBookingsEmbed) {
      setActiveTab('create-booking');
      return;
    }
    setActiveTab(initialTab);
  }, [initialTab, accountBookingsEmbed]);

  const {
    origin,
    destination,
    date,
    passengers,
    flightNumber,
    setTripDetails,
    setQuoteDetails,
    setBookingProduct,
    setClientTypeResolution,
    setAccountInvoicingContext,
    setPurchaseOrderRef,
    setCustomerDetails,
    setPreferredVehicleTypeHint,
  } = useBookingStore();

  const urlPrefillAppliedRef = useRef(false);
  const portalBootstrapAppliedRef = useRef(false);

  const [bookingFlowMode, setBookingFlowMode] = useState<'p2p' | 'hourly'>('p2p');
  const [hourlyDurationStr, setHourlyDurationStr] = useState('3');
  const [tripRequestFunnelOpen, setTripRequestFunnelOpen] = useState(false);
  const [tripRequestShellKey, setTripRequestShellKey] = useState(0);
  const [tripRequestEmbeddedPrefill, setTripRequestEmbeddedPrefill] =
    useState<RideDetailsFormValues | null>(null);

  const [originAddress, setOriginAddress] = useState(origin?.formattedAddress || '');
  const [destinationAddress, setDestinationAddress] = useState(
    destination?.formattedAddress || ''
  );
  const omitTripDatePrefill = Boolean(bookSearchPrefill?.omitTripDate);

  /**
   * When the store date/time would be in the past, use the same Johannesburg-aware defaults as
   * `defaultRideDetailsFormValues()` (Story **19.2** / FE.19.2) so the trip-request shell stays aligned.
   */
  const buildFutureFallbackDateAndTime = (): { date: Date; time: string } => {
    const v = defaultRideDetailsFormValues({ now: Date.now() });
    const inst = combineRideDateAndTime(v.rideDate, v.rideTime);
    if (!inst) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
      return { date: d, time: '12:00' };
    }
    const [yy, mm, dd] = v.rideDate.split('-').map((x) => Number.parseInt(x, 10));
    return { date: new Date(yy, mm - 1, dd), time: v.rideTime };
  };

  // Initialize date and time from store, preserving time component (Story 15.8: rebook leaves date empty)
  const getInitialDateAndTime = (): { date: Date | null; time: string } => {
    if (omitTripDatePrefill) {
      return { date: null, time: '' };
    }
    if (date) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const candidate =
        hours === 0 && minutes === 0
          ? (() => {
              const d = new Date(date);
              d.setHours(8, 0, 0, 0);
              return d;
            })()
          : date;
      if (rideDateTimeIsInPast(candidate)) {
        return buildFutureFallbackDateAndTime();
      }
      const ch = candidate.getHours();
      const cm = candidate.getMinutes();
      const timeStr = `${String(ch).padStart(2, '0')}:${String(cm).padStart(2, '0')}`;
      return { date: candidate, time: timeStr };
    }
    const v = defaultRideDetailsFormValues({ now: Date.now() });
    const [yy, mm, dd] = v.rideDate.split('-').map((x) => Number.parseInt(x, 10));
    const defaultDate = new Date(yy, mm - 1, dd);
    if (rideDateTimeIsInPast(combineRideDateAndTime(v.rideDate, v.rideTime) ?? defaultDate)) {
      return buildFutureFallbackDateAndTime();
    }
    return { date: defaultDate, time: v.rideTime };
  };

  const initialDateTime = getInitialDateAndTime();
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDateTime.date);
  const [selectedTime, setSelectedTime] = useState(initialDateTime.time);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [returnTime, setReturnTime] = useState('');
  const [passengerCount, setPassengerCount] = useState(passengers && passengers > 0 ? passengers : 1);
  const [flightNum, setFlightNum] = useState(flightNumber || '');
  const [returnTrip, setReturnTrip] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showFlightNumber, setShowFlightNumber] = useState(false);
  
  // Modify booking form state
  const [reservationNumber, setReservationNumber] = useState(
    () =>
      accountBookingsEmbed
        ? ''
        : modifyPrefillRef && modifyPrefillRef.trim() !== ''
          ? modifyPrefillRef.trim()
          : '',
  );
  const [countryCode, setCountryCode] = useState('+27'); // Default to South Africa
  const [phoneNumber, setPhoneNumber] = useState('');
  const [foundBooking, setFoundBooking] = useState<BookingSearchResult | null>(null);
  const [isSearchingBooking, setIsSearchingBooking] = useState(false);

  useEffect(() => {
    if (accountBookingsEmbed) return;
    if (modifyPrefillRef && modifyPrefillRef.trim() !== '') {
      setReservationNumber(modifyPrefillRef.trim());
    }
  }, [modifyPrefillRef, accountBookingsEmbed]);

  /** Layout effect: hydrate portal session before embedded trip-request / children paint (avoids submit without `portal_active_account_session`). */
  useLayoutEffect(() => {
    if (!portalRebookBootstrap || portalBootstrapAppliedRef.current) return;
    portalBootstrapAppliedRef.current = true;
    const b = portalRebookBootstrap;
    const resolution: WebClientTypeResolution = {
      clientType: 'account_client',
      customerAccountId: b.customerAccountId,
      clientTypeSource: 'portal_active_account_session',
    };
    setClientTypeResolution(resolution);
    setAccountInvoicingContext({
      accountDisplayName: b.accountDisplayName,
      defaultPoRequired: b.defaultPoRequired,
    });
    const poInitial = b.defaultPoRequired ? (b.defaultBillingEntityRef?.trim() ?? '') : '';
    setPurchaseOrderRef(poInitial);
    const displayName = b.memberName.trim() || b.memberEmail;
    setCustomerDetails({
      name: displayName,
      email: b.memberEmail,
      phone: '',
    });
    void clearBookAgainPortalHandoffCookieAction();
  }, [
    portalRebookBootstrap,
    setAccountInvoicingContext,
    setClientTypeResolution,
    setCustomerDetails,
    setPurchaseOrderRef,
  ]);

  useEffect(() => {
    if (!bookSearchPrefill || urlPrefillAppliedRef.current) return;
    urlPrefillAppliedRef.current = true;
    const p = bookSearchPrefill;
    if (p.originHint) setOriginAddress(p.originHint);
    if (p.destinationHint) setDestinationAddress(p.destinationHint);
    if (typeof p.passengers === 'number' && p.passengers > 0) {
      setPassengerCount(p.passengers);
      setTripDetails({ passengers: p.passengers });
    }
    if (p.serviceTypeHint?.trim()) {
      setPreferredVehicleTypeHint(p.serviceTypeHint.trim());
    } else {
      setPreferredVehicleTypeHint(null);
    }
    if (SHOW_TOUR_BOOKINGS_IN_BOOKING_SEARCH_FORM && p.intent === 'hourly_hire') {
      setBookingFlowMode('hourly');
      setTripDetails({ destination: null });
    } else {
      setBookingFlowMode('p2p');
    }
    if (p.omitTripDate) {
      setTripDetails({ date: null });
      setSelectedDate(null);
      setSelectedTime('');
    }
  }, [bookSearchPrefill, setPreferredVehicleTypeHint, setTripDetails]);

  // Sync date and time from store when it changes. Skip midnight-only values
  // (would overwrite user input with a stale date) and skip values already in
  // the past (would make the user submit a past pickup and hit the trip-request
  // "Date and time must be in the future" guard before they can correct it).
  useEffect(() => {
    if (!date) return;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 0 && minutes === 0) return;
    if (rideDateTimeIsInPast(date)) return;
    setSelectedDate(date);
    setSelectedTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  }, [date]);

  // Check if origin is an airport
  useEffect(() => {
    if (origin?.isAirport) {
      setShowFlightNumber(true);
    } else {
      setShowFlightNumber(false);
      setFlightNum('');
    }
  }, [origin]);

  // Sync local inputs when the *stored* place changes (selection / swap / hydration).
  // Depends only on `origin` / `destination` — not on the local address strings — so editing
  // the input after a selection does not get overwritten by this effect.
  useEffect(() => {
    if (!origin) return;
    setOriginAddress(origin.formattedAddress);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.origin;
      return newErrors;
    });
  }, [origin]);

  useEffect(() => {
    if (!destination) return;
    setDestinationAddress(destination.formattedAddress);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.destination;
      return newErrors;
    });
  }, [destination]);

  const handleOriginSelect = (place: PlaceResult) => {
    // Validate that place has required data
    if (!place.place_id || !place.geometry || !place.geometry.location) {
      setErrors((prev) => ({ ...prev, origin: 'Please select a valid location from the dropdown' }));
      return;
    }

    const formatted = place.formatted_address ?? '';
    const location = {
      placeId: place.place_id,
      formattedAddress: formatted,
      name: place.name ?? formatted,
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      isAirport: isAirport(place),
    };

    setOriginAddress(formatted);
    setTripDetails({ origin: location });
    
    // Clear error immediately
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.origin;
      return newErrors;
    });
  };

  const handleDestinationSelect = (place: PlaceResult) => {
    // Validate that place has required data
    if (!place.place_id || !place.geometry || !place.geometry.location) {
      setErrors((prev) => ({ ...prev, destination: 'Please select a valid location from the dropdown' }));
      return;
    }

    const formatted = place.formatted_address ?? '';
    const location = {
      placeId: place.place_id,
      formattedAddress: formatted,
      name: place.name ?? formatted,
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      isAirport: isAirport(place),
    };

    setDestinationAddress(formatted);
    setTripDetails({ destination: location });
    
    // Clear error immediately
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.destination;
      return newErrors;
    });
  };

  /** Keep local text editable; if user changes text vs stored place, drop the place so we do not quote stale coords. */
  const handleOriginAddressChange = (value: string) => {
    setOriginAddress(value);
    const latest = useBookingStore.getState().origin;
    if (latest && value.trim() !== latest.formattedAddress.trim()) {
      setTripDetails({ origin: null });
    }
  };

  const handleDestinationAddressChange = (value: string) => {
    setDestinationAddress(value);
    const latest = useBookingStore.getState().destination;
    if (latest && value.trim() !== latest.formattedAddress.trim()) {
      setTripDetails({ destination: null });
    }
  };

  const swapAddresses = () => {
    const tempOrigin = origin;
    const tempOriginAddress = originAddress;
    setOriginAddress(destinationAddress);
    setDestinationAddress(tempOriginAddress);
    if (destination) {
      setTripDetails({ origin: destination });
    }
    if (tempOrigin) {
      setTripDetails({ destination: tempOrigin });
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (!dateValue) {
      setSelectedDate(null);
      setTripDetails({ date: null });
      setErrors((prev) => ({ ...prev, date: '' }));
      return;
    }
    const [year, month, day] = dateValue.split('-').map(Number);
    const [hours, minutes] = (selectedTime || '08:00').split(':').map(Number);
    const newDate = new Date(year, month - 1, day, hours, minutes || 0, 0, 0);
    setSelectedDate(newDate);
    setTripDetails({ date: newDate });
    setErrors((prev) => ({ ...prev, date: '' }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    setSelectedTime(timeValue);
    if (!timeValue) {
      setTripDetails({ date: null });
      return;
    }
    const currentDate = selectedDate ?? date ?? new Date();
    const [hours, minutes] = timeValue.split(':').map(Number);
    const dateWithTime = new Date(currentDate);
    dateWithTime.setHours(hours, minutes, 0, 0);
    setSelectedDate(dateWithTime);
    setTripDetails({ date: dateWithTime });
  };

  const handleReturnDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const [year, month, day] = dateValue.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      setReturnDate(newDate);
      setErrors((prev) => ({ ...prev, returnDate: '' }));
    }
  };

  const handleReturnTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    setReturnTime(timeValue);
    setErrors((prev) => ({ ...prev, returnTime: '' }));
  };

  const handleFlightNumberChange = (value: string) => {
    setFlightNum(value);
    setTripDetails({ flightNumber: value || null });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrors({});
      setIsLoading(true);

      if (bookingFlowMode === 'hourly') {
        const storeState = useBookingStore.getState();
        const pickup = storeState.origin;
        if (!pickup) {
          setErrors((prev) => ({
            ...prev,
            origin: 'Please select a pickup location from the dropdown suggestions',
          }));
          setIsLoading(false);
          return;
        }
        if (!selectedDate || !selectedTime?.trim()) {
          setErrors((prev) => ({
            ...prev,
            ...(selectedDate ? {} : { date: 'Please select a date' }),
            ...(selectedTime?.trim() ? {} : { time: 'Please select a time' }),
          }));
          setIsLoading(false);
          return;
        }
        const [hourlyH, hourlyM] = selectedTime.split(':').map(Number);
        const dateWithTime = new Date(selectedDate);
        dateWithTime.setHours(hourlyH, hourlyM, 0, 0);
        if (rideDateTimeIsInPast(dateWithTime)) {
          setErrors((prev) => ({ ...prev, time: PICKUP_SCHEDULE_LEAD_MESSAGE }));
          setIsLoading(false);
          return;
        }
        const durationHours = parseFloat(hourlyDurationStr);
        if (!Number.isFinite(durationHours) || durationHours < 0.5) {
          setErrors((prev) => ({
            ...prev,
            hourlyDuration: 'Enter duration (minimum 0.5 hours)',
          }));
          setIsLoading(false);
          return;
        }
        setTripDetails({ date: dateWithTime, destination: null });
        try {
          const result = await calculateHourlyQuote({
            pickup,
            date: dateWithTime,
            passengers: passengerCount,
            durationHours,
          });
          if (!result.success) {
            setErrors({ submit: result.error });
            setIsLoading(false);
            return;
          }
          setBookingProduct({
            bookingIntent: 'hourly_hire',
            hourlyDurationHours: durationHours,
            hourlyServiceAreaNotes: null,
            hourlyBillableHours: result.data.billableHours,
          });
          setQuoteDetails({
            quoteAmount: result.data.vehicleOptions[0]?.price ?? 0,
            estimatedDuration: null,
            distance: null,
            vehicleOptions: result.data.vehicleOptions,
          });
          router.push(`${bookingFunnelBasePath}/quote`);
        } catch {
          setErrors({ submit: 'An error occurred. Please try again.' });
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Get fresh values from store to ensure we have the latest state
      // Access store directly to get current state (not destructured values which might be stale)
      const storeState = useBookingStore.getState();
      const currentOrigin = storeState.origin;
      const currentDestination = storeState.destination;

      const originToValidate = currentOrigin || origin;
      const destinationToValidate = currentDestination || destination;

      // Check if address is typed but not selected from dropdown
      if (originAddress && !originToValidate) {
        setErrors((prev) => ({ ...prev, origin: 'Please select a pickup location from the dropdown suggestions' }));
        setIsLoading(false);
        return;
      }
      if (!originToValidate) {
        setErrors((prev) => ({ ...prev, origin: 'Please select a pickup location from the dropdown' }));
        setIsLoading(false);
        return;
      }

      if (destinationAddress && !destinationToValidate) {
        setErrors((prev) => ({ ...prev, destination: 'Please select a drop-off location from the dropdown suggestions' }));
        setIsLoading(false);
        return;
      }
      if (!destinationToValidate) {
        setErrors((prev) => ({ ...prev, destination: 'Please select a drop-off location from the dropdown' }));
        setIsLoading(false);
        return;
      }

    if (!selectedDate) {
      setErrors((prev) => ({ ...prev, date: 'Please select a date' }));
      setIsLoading(false);
      return;
    }

    if (!selectedTime?.trim()) {
      setErrors((prev) => ({ ...prev, time: 'Please select a time' }));
      setIsLoading(false);
      return;
    }

    // Guard against past pickup time. The Zod schema only checks that the date
    // is today or later — without this, a user opening the homepage at 19:00
    // with the default 08:00 time would submit a past timestamp and immediately
    // hit the trip-request shell's "Date and time must be in the future"
    // dead-end UI. Surface the issue inline so they can fix it in this form.
    {
      const [pickH, pickM] = selectedTime.split(':').map(Number);
      const pickupAt = new Date(selectedDate);
      pickupAt.setHours(pickH, pickM, 0, 0);
      if (rideDateTimeIsInPast(pickupAt)) {
        setErrors((prev) => ({ ...prev, time: PICKUP_SCHEDULE_LEAD_MESSAGE }));
        setIsLoading(false);
        return;
      }
    }

    // Validate return trip fields if enabled
    if (returnTrip) {
      if (!returnDate) {
        setErrors((prev) => ({ ...prev, returnDate: 'Please select a return date' }));
        setIsLoading(false);
        return;
      }
      if (!returnTime) {
        setErrors((prev) => ({ ...prev, returnTime: 'Please select a return time' }));
        setIsLoading(false);
        return;
      }
    }

    // Validate form data with Zod
    try {
      // Ensure we have the latest date and time before submitting
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const dateWithTime = new Date(selectedDate as Date);
      dateWithTime.setHours(hours, minutes, 0, 0);
      
      // Update store with the final date/time before submitting
      setTripDetails({ date: dateWithTime });

      const formData: SearchParams = {
        origin: originToValidate,
        destination: destinationToValidate,
        date: dateWithTime,
        passengers: passengerCount,
        flightNumber: showFlightNumber && flightNum ? flightNum : undefined,
      };

      searchFormSchema.parse(formData);

      setBookingProduct({
        bookingIntent: 'point_to_point',
        hourlyDurationHours: null,
        hourlyServiceAreaNotes: null,
        hourlyBillableHours: null,
      });

      /** Epic 10 public funnel: point-to-point → trip request (no instant pricing / quote page). */
      const ridePrefill = rideDetailsFromMarketingP2P({
        origin: originToValidate,
        destination: destinationToValidate,
        pickupInput: originAddress,
        destinationInput: destinationAddress,
        dateWithTime,
        passengers: passengerCount,
        specialInstructions,
        flightNumber: flightNum,
        showFlightNumber,
      });
      saveTripRequestPrefill(ridePrefill);
      setTripRequestEmbeddedPrefill(ridePrefill);
      setTripRequestShellKey((k) => k + 1);
      setTripRequestFunnelOpen(true);
      setIsLoading(false);
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ submit: 'An error occurred. Please try again.' });
      }
      setIsLoading(false);
    }
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle modify booking form submission
  const handleSearchReservation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsSearchingBooking(true);

    try {
      const result = await searchBooking({
        reservationNumber,
        countryCode,
        phoneNumber,
      });

      if (!result.success) {
        setErrors({ search: result.error });
        setIsSearchingBooking(false);
        return;
      }

      setFoundBooking(result.data);
      setIsSearchingBooking(false);
    } catch (error) {
      console.error('Error searching reservation:', error);
      setErrors({ search: 'An error occurred. Please try again.' });
      setIsSearchingBooking(false);
    }
  };

  // Handle modify booking action
  const handleModifyBooking = () => {
    if (foundBooking) {
      // Navigate to modify page with booking ID
      router.push(`${bookingFunnelBasePath}/modify?id=${foundBooking.id}`);
    }
  };

  // Handle cancel booking action
  const handleCancelBooking = () => {
    if (foundBooking) {
      // Navigate to cancel page with booking ID
      router.push(`${bookingFunnelBasePath}/cancel?id=${foundBooking.id}`);
    }
  };

  // Reset modify booking form when switching tabs
  useEffect(() => {
    if (accountBookingsEmbed || activeTab === 'create-booking') {
      setFoundBooking(null);
      setReservationNumber('');
      setPhoneNumber('');
      setErrors({});
    }
    if (!accountBookingsEmbed && activeTab === 'modify-booking') {
      setTripRequestFunnelOpen(false);
      setTripRequestEmbeddedPrefill(null);
    }
  }, [activeTab, accountBookingsEmbed]);

  return (
    <div
      className={cn(
        'w-full min-w-[320px] mx-auto border',
        shellTheme === 'accountPortal'
          ? 'rounded-account-card border-account-border bg-account-surface shadow-account-1'
          : 'rounded-lg bg-white shadow-lg border-gray-200',
        variant === 'marketing'
          ? 'flex flex-col rounded-lg overflow-hidden min-h-[520px] sm:min-h-[600px] md:min-h-[760px] lg:min-h-[820px]'
          : shellTheme !== 'accountPortal' && 'rounded-lg'
      )}
    >
      {variant === 'marketing' && (
        <div className="bg-vest-rust text-white text-center py-3 px-4 text-sm font-semibold tracking-wide">
          All-Inclusive Booking
        </div>
      )}
      {!accountBookingsEmbed ? (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between px-4 pt-3 pb-2.5 border-b gap-2',
          shellTheme === 'accountPortal'
            ? 'bg-account-surface-hover border-account-border'
            : 'bg-gray-100 border-gray-200'
        )}
      >
        <TabsList className="flex gap-0">
          <TabsTrigger
            value="create-booking"
            isActive={activeTab === 'create-booking'}
            onClick={() => setActiveTab('create-booking')}
            className="rounded-t-lg"
          >
            {variant === 'marketing' ? 'Shuttle and Tours' : 'Create New Booking'}
          </TabsTrigger>
          <TabsTrigger
            value="modify-booking"
            isActive={activeTab === 'modify-booking'}
            onClick={() => setActiveTab('modify-booking')}
            className="rounded-t-lg"
          >
            {variant === 'marketing' ? 'Manage booking' : 'Modify or Cancel Booking'}
          </TabsTrigger>
        </TabsList>
      </div>
      ) : null}

      <div
        className={cn(
          'px-4 py-4 space-y-4',
          shellTheme === 'accountPortal' ? 'bg-account-surface' : 'bg-white',
          variant === 'marketing' && 'flex min-h-0 flex-1 flex-col'
        )}
      >
      {!accountBookingsEmbed && activeTab === 'modify-booking' ? (
        // Modify Booking Form
        <div className="space-y-6 w-full">
          {!foundBooking ? (
            <form onSubmit={handleSearchReservation} className="space-y-6 w-full">
              {/* Booking Search */}
              <div className="space-y-3 w-full">
                <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Booking Search</h2>
                <div className="space-y-3 w-full">
                  <div className="space-y-1.5">
                    <Label htmlFor="reservation-number" className="text-xs font-medium text-gray-700">
                      Reservation Number
                    </Label>
                    <Input
                      id="reservation-number"
                      type="text"
                      value={reservationNumber}
                      onChange={(e) => setReservationNumber(e.target.value)}
                      placeholder="Enter reservation number"
                      required
                      className="h-12 text-xs font-bold w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="country-code" className="text-xs font-medium text-gray-700">
                        Country code
                      </Label>
                      <Select
                        id="country-code"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="h-12 text-xs font-bold w-full"
                      >
                        <option value="+27">+27 (ZA)</option>
                        <option value="+1">+1 (US/CA)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+61">+61 (AU)</option>
                        <option value="+91">+91 (IN)</option>
                        <option value="+234">+234 (NG)</option>
                        <option value="+254">+254 (KE)</option>
                        <option value="+260">+260 (ZM)</option>
                        <option value="+263">+263 (ZW)</option>
                        <option value="+264">+264 (NA)</option>
                        <option value="+265">+265 (MW)</option>
                        <option value="+266">+266 (LS)</option>
                        <option value="+267">+267 (BW)</option>
                        <option value="+268">+268 (SZ)</option>
                        <option value="+269">+269 (KM)</option>
                      </Select>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="phone-number" className="text-xs font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <Input
                        id="phone-number"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Phone Number"
                        required
                        className="h-12 text-xs font-bold w-full"
                      />
                    </div>
                  </div>

                  {errors.search && (
                    <p className="text-xs text-red-500" role="alert">{errors.search}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#bc4328] hover:bg-[#a83a22] active:bg-[#95301c] text-white py-3.5 text-sm font-medium rounded-lg shadow-md transition-colors"
                disabled={isSearchingBooking}
              >
                {isSearchingBooking ? 'Searching...' : 'Search Reservation'}
              </Button>
            </form>
          ) : (
            // Booking Found - Show Modify/Cancel Options
            <div className="space-y-6 w-full">
              {/* Booking Details */}
              <div className="space-y-3 w-full">
                <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Booking Details</h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <div className="text-sm text-green-800">
                    <p className="font-semibold mb-1">Reservation: <span className="font-normal">{foundBooking.reservationNumber}</span></p>
                    <p className="font-semibold mb-1">Customer: <span className="font-normal">{foundBooking.customerName}</span></p>
                    <p className="font-semibold mb-1">Route: <span className="font-normal">{foundBooking.origin} → {foundBooking.destination}</span></p>
                    <p className="font-semibold mb-1">Date: <span className="font-normal">{new Date(foundBooking.pickupDateTime).toLocaleDateString()}</span></p>
                    <p className="font-semibold mb-1">Status: <span className="font-normal">{foundBooking.status}</span></p>
                    <p className="font-semibold">Payment Status: <span className="font-normal">{foundBooking.paymentStatus}</span></p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 w-full">
                <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Actions</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleModifyBooking}
                    className="flex-1 bg-[#bc4328] hover:bg-[#a83a22] active:bg-[#95301c] text-white py-3.5 text-sm font-medium rounded-lg shadow-md transition-colors"
                  >
                    Modify Booking
                  </Button>
                  <Button
                    onClick={handleCancelBooking}
                    className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3.5 text-sm font-medium rounded-lg shadow-md transition-colors"
                  >
                    Cancel Booking
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    setFoundBooking(null);
                    setReservationNumber('');
                    setPhoneNumber('');
                    setErrors({});
                  }}
                  variant="outline"
                  className="w-full py-3.5 text-sm font-medium rounded-lg"
                >
                  Search Another Booking
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : tripRequestFunnelOpen && bookingFlowMode === 'p2p' ? (
        <div
          className={cn(
            'w-full',
            variant === 'marketing' && 'flex min-h-0 flex-1 flex-col overflow-hidden py-1'
          )}
        >
          <TripRequestBookingShell
            key={tripRequestShellKey}
            embedded
            embeddedRidePrefill={tripRequestEmbeddedPrefill}
            phoneCountryIso2Hint={tripRequestPhoneCountryIso2Hint}
            bookingSearchHref={tripRequestBookingSearchHref}
            onSubmitSuccess={
              opsBookingsEmbed && onOpsSubmitSuccess
                ? onOpsSubmitSuccess
                : accountBookingsEmbed
                  ? () => router.refresh()
                  : undefined
            }
            opsSubmit={opsBookingsEmbed}
            opsReferrerId={opsReferrerId}
            onExit={() => {
              setTripRequestFunnelOpen(false);
              setTripRequestEmbeddedPrefill(null);
            }}
          />
        </div>
      ) : (
        // Create New Booking Form
      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        {SHOW_TOUR_BOOKINGS_IN_BOOKING_SEARCH_FORM ? (
          <>
            <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50 gap-1">
              <button
                type="button"
                onClick={() => {
                  setBookingFlowMode('p2p');
                  setTripRequestFunnelOpen(false);
                  setTripRequestEmbeddedPrefill(null);
                }}
                className={cn(
                  'flex-1 rounded-md py-2 px-2 text-xs font-semibold transition-colors',
                  bookingFlowMode === 'p2p'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Shuttle Bookings
              </button>
              <button
                type="button"
                onClick={() => {
                  setBookingFlowMode('hourly');
                  setTripDetails({ destination: null });
                  setTripRequestFunnelOpen(false);
                  setTripRequestEmbeddedPrefill(null);
                }}
                className={cn(
                  'flex-1 rounded-md py-2 px-2 text-xs font-semibold transition-colors',
                  bookingFlowMode === 'hourly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Tour Bookings
              </button>
            </div>
            <p className="text-center text-xs text-gray-600">
              <Link
                href="/tours"
                className="font-semibold text-vest-rust hover:underline underline-offset-2"
              >
                Tours &amp; experiences
              </Link>{' '}
              — curated packages with online quote &amp; checkout
            </p>
          </>
        ) : null}

        {/* Ride Details */}
        <div className="space-y-3 w-full">
          <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Ride Details</h2>
          <div className="space-y-2 w-full">
            {/* Pickup Address - Button Style */}
            <div className="relative w-full">
              <AddressAutocomplete
                label=""
                value={originAddress}
                onChange={handleOriginAddressChange}
                onSelect={handleOriginSelect}
                placeholder={
                  bookingFlowMode === 'hourly'
                    ? 'Pickup service point / address'
                    : 'Pickup Address'
                }
                required
                error={errors.origin}
                buttonStyle={true}
                inputId="pickup-address-input"
                icon="pickup"
              />
            </div>

            {bookingFlowMode === 'hourly' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hourly-duration" className="text-xs font-medium text-gray-700">
                    Duration (hours)
                  </Label>
                  <Input
                    id="hourly-duration"
                    type="number"
                    step="0.5"
                    min={0.5}
                    value={hourlyDurationStr}
                    onChange={(e) => setHourlyDurationStr(e.target.value)}
                    className="h-12 text-xs font-bold w-full"
                  />
                  {errors.hourlyDuration && (
                    <p className="text-xs text-red-500" role="alert">
                      {errors.hourlyDuration}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Dropoff Address - Button Style with Swap Button */}
            {bookingFlowMode === 'p2p' && (
            <div className="flex items-start gap-2 w-full">
              <div className="flex-1 min-w-0 relative">
                <AddressAutocomplete
                  label=""
                  value={destinationAddress}
                  onChange={handleDestinationAddressChange}
                  onSelect={handleDestinationSelect}
                  placeholder="Drop-off service point / address"
                  required
                  error={errors.destination}
                  buttonStyle={true}
                  inputId="dropoff-address-input"
                  icon="dropoff"
                />
              </div>
              {/* Swap Button - Positioned to the right, aligned with both fields */}
              <button
                type="button"
                onClick={swapAddresses}
                className="h-12 w-12 rounded-full bg-[#bc4328] text-white flex items-center justify-center hover:bg-[#a83a22] active:bg-[#95301c] transition-colors flex-shrink-0 shadow-md"
                aria-label="Swap addresses"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </button>
            </div>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="space-y-3 w-full">
          <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Date & Time</h2>
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="date" className="text-xs font-medium text-gray-700" required>Date</Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={selectedDate ? formatDateForInput(selectedDate) : ''}
                  onChange={handleDateChange}
                  required
                  className="h-12 text-xs font-bold w-full"
                  suppressHydrationWarning
                />
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
              </div>
              {errors.date && (
                <p className="text-xs text-red-500" role="alert">{errors.date}</p>
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="time" className="text-xs font-medium text-gray-700" required>Time</Label>
              <div className="relative">
                <div className="absolute left-3 top-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <Input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={handleTimeChange}
                  required
                  className="pl-10 pr-10 h-12 text-xs font-bold w-full"
                  suppressHydrationWarning
                />
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </div>
              </div>
              {errors.time && (
                <p className="text-xs text-red-500" role="alert">{errors.time}</p>
              )}
            </div>
          </div>
          
          {/* Return Date & Time - Only show when return trip is enabled */}
          {returnTrip && (
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="return-date" className="text-xs font-medium text-gray-700" required>Return Date</Label>
                <div className="relative">
                  <Input
                    id="return-date"
                    type="date"
                    value={returnDate ? formatDateForInput(returnDate) : ''}
                    onChange={handleReturnDateChange}
                    required={returnTrip}
                    className="h-12 text-xs font-bold w-full"
                    suppressHydrationWarning
                  />
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                </div>
                {errors.returnDate && (
                  <p className="text-xs text-red-500" role="alert">{errors.returnDate}</p>
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="return-time" className="text-xs font-medium text-gray-700" required>Return Time</Label>
                <div className="relative">
                  <div className="absolute left-3 top-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <Input
                    id="return-time"
                    type="time"
                    value={returnTime}
                    onChange={handleReturnTimeChange}
                    required={returnTrip}
                    className="pl-10 pr-10 h-12 text-xs font-bold w-full"
                    suppressHydrationWarning
                  />
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </div>
                </div>
                {errors.returnTime && (
                  <p className="text-xs text-red-500" role="alert">{errors.returnTime}</p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-1">
            <Label htmlFor="return-trip" className="text-xs font-normal text-gray-700 cursor-pointer">Add return trip</Label>
            <Switch
              id="return-trip"
              checked={returnTrip}
              onCheckedChange={setReturnTrip}
            />
          </div>
        </div>

        {/* No. of Passengers — shared stepper (avoids native number input + custom arrows clash). */}
        <div className="space-y-3 w-full">
          <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">No. of Passengers</h2>
          <TripRequestPassengerStepper
            id="quick-book-passengers"
            value={passengerCount}
            onChange={(n) => {
              setPassengerCount(n);
              setTripDetails({ passengers: n });
              setErrors((prev) => {
                const next = { ...prev };
                delete next.passengers;
                return next;
              });
            }}
            error={errors.passengers}
          />
        </div>

        {/* Special Instruction */}
        <div className="space-y-3 w-full">
          <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Special Instruction</h2>
          <Textarea
            placeholder="Please enter note"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            rows={3}
            className="h-12 text-xs font-bold w-full"
          />
        </div>

        {/* Flight Number (conditional) */}
        {showFlightNumber && (
          <div className="space-y-2">
            <Label htmlFor="flightNumber">Flight Number (Optional)</Label>
            <Input
              id="flightNumber"
              type="text"
              value={flightNum}
              onChange={(e) => handleFlightNumberChange(e.target.value)}
              placeholder="e.g., SA123"
            />
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800" role="alert">{errors.submit}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className={cn(
            'w-full text-white py-3.5 text-sm font-medium shadow-md transition-colors',
            variant === 'marketing'
              ? 'rounded-sm bg-vest-rust hover:bg-vest-rust-dark active:bg-[#8f3523]'
              : 'rounded-lg bg-vest-rust hover:bg-vest-rust-dark active:bg-[#8f3523]'
          )}
          disabled={isLoading}
        >
          {isLoading
            ? bookingFlowMode === 'hourly'
              ? 'Calculating Quote...'
              : 'Loading…'
            : bookingFlowMode === 'hourly'
              ? 'Get hourly quote'
              : 'Request a trip'}
        </Button>
      </form>
      )}
      </div>
    </div>
  );
}
