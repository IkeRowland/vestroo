'use client';

/**
 * Browser Back (FE.19.1 / Task 0): We do not intercept `popstate` or push synthetic entries here.
 * The OS Back button follows normal browser history (e.g. leaves `/book/trip-request` or the
 * embedded `/book/search` view). In-funnel step changes are driven by the shell **Back** control
 * so React session state is not competing with a parallel history stack (Next.js App Router state
 * already uses `history.state`).
 */

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  accountRequiresPurchaseOrderMessage,
  isPurchaseOrderRequiredSubmitError,
} from '@/lib/account-po-policy';

import { submitTripRequest } from '@/actions/submitTripRequest';
import { submitOpsTripRequest } from '@/actions/submitOpsTripRequest';
import { getTripRequestVehicleOffers } from '@/actions/getTripRequestVehicleOffers';
import type { TripRequestCountryOption } from '@/features/booking/components/trip-request/load-trip-request-countries';
import {
  defaultRideDetailsFormValues,
  validateRideDetailsStep,
  type RideDetailsFieldErrors,
  type RideDetailsFormValues,
  type ValidatedRideDetailsData,
} from '@/features/booking/components/trip-request/ride-details-validate';
import type { TripOfferVehicle } from '@/features/booking/components/trip-request/trip-offer-vehicle';
import {
  tripRequestSubmitPayloadSchema,
  tripRequestPassengerFieldsSchema,
} from '@/features/booking/components/trip-request/trip-request-submit-schema';
import type { PassengerFieldErrors } from '@/features/booking/components/trip-request/TripRequestPassengerSlide';
import { TripRequestPassengerSlide } from '@/features/booking/components/trip-request/TripRequestPassengerSlide';
import { TripRequestVehicleSlide } from '@/features/booking/components/trip-request/TripRequestVehicleSlide';
import { TripRequestRideDetailsSlide } from '@/features/booking/components/trip-request/TripRequestRideDetailsSlide';
import { TripRequestFunnelProgress } from '@/features/booking/components/trip-request/TripRequestFunnelProgress';
import { getTripRequestPrefillForBootstrap } from '@/features/booking/components/trip-request/trip-request-prefill';
import {
  BookingAccountDomainGate,
} from '@/features/booking/components/BookingAccountDomainGate';
import type { WebClientTypeResolution } from '@/actions/booking-schemas';
import { pickVehicleIdFromServiceTypeHint } from '@/lib/quote-accept-prefill';
import { useBookingStore } from '@/features/booking/hooks/useBookingStore';
import {
  bookingFunnelSubmitErrorCategoryFromMessage,
  getBookingFunnelVariant,
  trackBookingFunnelSlideComplete,
  trackBookingFunnelSlideView,
  trackBookingFunnelSubmitError,
  trackBookingFunnelSubmitSuccess,
  trackBookingFunnelView,
} from '@/lib/booking-funnel-analytics';

/** Populated from marketing prefill / session — ride details step removed from UI (FE.10). */
export type TripRequestValidatedSlide1 = ValidatedRideDetailsData;

/** In-funnel steps before confirmation (FE.19.1): trip → vehicle → passenger. */
type FunnelStep = 0 | 1 | 2;

const SLIDE_TITLES = ['Trip details', 'Choose your vehicle', 'Passenger details', 'Request received'] as const;

/** FE.19.12 — locked quote-timing line (Progress Notes / AC3). */
const QUOTE_EMAIL_BUSINESS_HOURS_COPY =
  'You receive a quote by email, usually within approximately 30 minutes during business hours.';

/** FE.19.6 — visible sub-copy under slide heading (required tone + quote-time reassurance). */
const VEHICLE_SLIDE_INTRO_COPY =
  'Selection is required before passenger details. Pick one vehicle class below to continue. Availability may be adjusted when we prepare your quote.';

type PassengerDirtyFlags = {
  firstName: boolean;
  lastName: boolean;
  email: boolean;
  country: boolean;
  phone: boolean;
};

type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'missing_prefill' }
  | { status: 'invalid_prefill'; errors?: RideDetailsFieldErrors };

function validatedRideDetailsToFormValues(data: ValidatedRideDetailsData): RideDetailsFormValues {
  return {
    pickup: data.pickup,
    destination: data.destination,
    pickupInput: data.pickup.formattedAddress,
    destinationInput: data.destination.formattedAddress,
    rideDate: data.rideDate,
    rideTime: data.rideTime,
    passengers: data.passengers,
    specialInstructions: data.specialInstructions,
    manualAirportPickup: data.manualAirportPickup,
    flightNumber: data.flightNumber,
  };
}

/**
 * Map a `validateRideDetailsStep` failure into a single user-facing sentence.
 * Keeps the dead-end UI actionable: e.g. shows "Date and time must be in the
 * future" instead of the generic "We could not load your trip details" when
 * we know exactly which input is wrong.
 */
function describeInvalidPrefill(errors: RideDetailsFieldErrors | undefined): string {
  if (!errors) {
    return 'We could not load your trip details. Go back to the booking form and try again.';
  }
  return (
    errors.submit ||
    errors.schedule ||
    errors.rideDate ||
    errors.rideTime ||
    errors.pickup ||
    errors.destination ||
    errors.passengers ||
    errors.flightNumber ||
    'We could not load your trip details. Go back to the booking form and try again.'
  );
}

function passengerErrorsForDisplay(
  dirty: PassengerDirtyFlags,
  parsed: ReturnType<typeof tripRequestPassengerFieldsSchema.safeParse>,
): PassengerFieldErrors {
  if (parsed.success) return {};
  const flat = parsed.error.flatten().fieldErrors;
  const out: PassengerFieldErrors = {};
  if (dirty.firstName && flat.firstName?.[0]) out.firstName = flat.firstName[0];
  if (dirty.lastName && flat.lastName?.[0]) out.lastName = flat.lastName[0];
  if (dirty.email && flat.email?.[0]) out.email = flat.email[0];
  if (dirty.country && flat.countryIso2?.[0]) out.countryIso2 = flat.countryIso2[0];
  if (dirty.phone && flat.phoneNational?.[0]) out.phoneNational = flat.phoneNational[0];
  return out;
}

export type TripRequestBookingShellProps = {
  /** Rendered inside marketing/search card instead of standalone `/book/trip-request` page. */
  embedded?: boolean;
  /**
   * Ride details from the parent booking form (required for embedded flow). Avoids relying on
   * sessionStorage alone, which breaks under React Strict Mode double-mount if consumed eagerly.
   */
  embeddedRidePrefill?: RideDetailsFormValues | null;
  /** Server hint: ISO-3166 alpha-2 for phone country on slide 3 (FE.19.2). Omit → `za`. */
  phoneCountryIso2Hint?: string | null;
  /** Recovery link when prefill is missing (public `/book/search` vs portal `/account/bookings`). */
  bookingSearchHref?: string;
  /** Leave the trip-request funnel (e.g. after success “Submit another request”). */
  onExit?: () => void;
  /** After a successful server submit (e.g. account portal list should refetch via `router.refresh()`). */
  onSubmitSuccess?: () => void;
  /** Ops embed: persist via staff action with optional referrer attribution. */
  opsSubmit?: boolean;
  opsReferrerId?: string | null;
};

export function TripRequestBookingShell(props: TripRequestBookingShellProps) {
  const {
    embedded = false,
    embeddedRidePrefill = null,
    phoneCountryIso2Hint = null,
    bookingSearchHref = '/book/search',
    onExit,
    onSubmitSuccess,
    opsSubmit = false,
    opsReferrerId = null,
  } = props;
  const reduceMotion = useReducedMotion();
  const [funnelStep, setFunnelStep] = React.useState<FunnelStep>(0);
  const [bootstrap, setBootstrap] = React.useState<BootstrapState>({ status: 'loading' });
  const [rideDetailsDraft, setRideDetailsDraft] = React.useState<RideDetailsFormValues>(() =>
    defaultRideDetailsFormValues(),
  );
  const [rideDetailsFieldErrors, setRideDetailsFieldErrors] = React.useState<RideDetailsFieldErrors>({});
  const [validatedSlide1, setValidatedSlide1] = React.useState<ValidatedRideDetailsData | null>(null);
  const [validatedSlide2Vehicle, setValidatedSlide2Vehicle] = React.useState<TripOfferVehicle | null>(
    null,
  );
  const [vehicleOffers, setVehicleOffers] = React.useState<TripOfferVehicle[] | null>(null);
  const [vehicleLoading, setVehicleLoading] = React.useState(false);
  const [vehicleFetchError, setVehicleFetchError] = React.useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string | null>(null);
  const [slide2Error, setSlide2Error] = React.useState<string | null>(null);
  const [passengerFirstName, setPassengerFirstName] = React.useState('');
  const [passengerLastName, setPassengerLastName] = React.useState('');
  const [passengerEmail, setPassengerEmail] = React.useState('');
  const [passengerCountryIso2, setPassengerCountryIso2] = React.useState<string | null>(() => {
    const t = phoneCountryIso2Hint?.trim().toLowerCase();
    return t || 'za';
  });
  const [passengerPhoneNational, setPassengerPhoneNational] = React.useState('');
  const [passengerDirty, setPassengerDirty] = React.useState<PassengerDirtyFlags>({
    firstName: false,
    lastName: false,
    email: false,
    country: false,
    phone: false,
  });
  const [submitState, setSubmitState] = React.useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [tripClientResolution, setTripClientResolution] = React.useState<WebClientTypeResolution | null>(
    null,
  );
  const [tripInvoicingContext, setTripInvoicingContext] = React.useState<{
    accountDisplayName: string;
    defaultPoRequired: boolean;
  } | null>(null);
  const [tripPurchaseOrderRef, setTripPurchaseOrderRef] = React.useState('');
  const [submitMessage, setSubmitMessage] = React.useState<string | null>(null);
  const [bookingRefSuccess, setBookingRefSuccess] = React.useState<string | null>(null);
  const [bookingRefCopied, setBookingRefCopied] = React.useState(false);
  const slideHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const tripPurchaseOrderInputRef = React.useRef<HTMLInputElement>(null);
  const isInitialStepMount = React.useRef(true);
  const prevValidatedSlide1Json = React.useRef<string | null>(null);
  /** Last validated pickup/destination place ids — used to clear slide 2 only when **addresses** change, not on passenger-only edits (FE.19.5). */
  const prevTripPlacesJson = React.useRef<string | null>(null);
  /** FE.19.10 — `performance.now()` anchor when funnel becomes interactive (`bootstrap.status === 'ready'`). */
  const funnelInteractivePerfRef = React.useRef<number | null>(null);
  const bookingFunnelViewSentRef = React.useRef(false);
  const lastSlideViewIndexRef = React.useRef<number | null>(null);

  const funnelAnalyticsBase = React.useCallback(
    () => ({ variant: getBookingFunnelVariant(), embedded }),
    [embedded],
  );

  const showConfirmation = submitState === 'success';
  const progressIndex = showConfirmation ? 3 : funnelStep;

  const portalClientResolution = useBookingStore((s) => s.clientTypeResolution);
  const portalAccountInvoicingContext = useBookingStore((s) => s.accountInvoicingContext);
  const portalPurchaseOrderRef = useBookingStore((s) => s.purchaseOrderRef);
  const portalCustomer = useBookingStore((s) => s.customer);
  const portalPassengerSeededRef = React.useRef(false);

  React.useEffect(() => {
    const r = portalClientResolution;
    if (r?.clientType !== 'account_client' || r.clientTypeSource !== 'portal_active_account_session') {
      portalPassengerSeededRef.current = false;
      return;
    }
    setTripClientResolution(r);
    if (portalAccountInvoicingContext) {
      setTripInvoicingContext(portalAccountInvoicingContext);
    }
    setTripPurchaseOrderRef(portalPurchaseOrderRef || '');
    if (!portalPassengerSeededRef.current) {
      portalPassengerSeededRef.current = true;
      const c = portalCustomer;
      if (c?.email) {
        setPassengerEmail(c.email);
      }
      if (c?.name) {
        const parts = c.name.trim().split(/\s+/);
        setPassengerFirstName(parts[0] ?? '');
        setPassengerLastName(parts.slice(1).join(' ') || parts[0] || '');
      }
    }
  }, [portalAccountInvoicingContext, portalClientResolution, portalCustomer, portalPurchaseOrderRef]);

  React.useEffect(() => {
    if (embedded) {
      if (embeddedRidePrefill) {
        const result = validateRideDetailsStep(embeddedRidePrefill);
        setRideDetailsDraft(embeddedRidePrefill);
        if (result.ok) {
          setRideDetailsFieldErrors({});
          // Marketing / parent form already captured trip details — go straight to vehicle (slide 2).
          prevTripPlacesJson.current = JSON.stringify({
            pu: result.data.pickup.placeId,
            de: result.data.destination.placeId,
          });
          setValidatedSlide1(result.data);
          setFunnelStep(1);
          setBootstrap({ status: 'ready' });
        } else {
          setBootstrap({ status: 'invalid_prefill', errors: result.errors });
        }
        return;
      }
      setBootstrap({ status: 'missing_prefill' });
      return;
    }

    const fromMarketing = getTripRequestPrefillForBootstrap();
    const values = fromMarketing ?? defaultRideDetailsFormValues();
    const result = validateRideDetailsStep(values);
    setRideDetailsDraft(values);

    if (result.ok) {
      setRideDetailsFieldErrors({});
      setValidatedSlide1(null);
      setBootstrap({ status: 'ready' });
      return;
    }

    if (!fromMarketing) {
      setBootstrap({ status: 'missing_prefill' });
      return;
    }

    setRideDetailsFieldErrors(result.errors);
    setValidatedSlide1(null);
    setBootstrap({ status: 'ready' });
  }, [embedded, embeddedRidePrefill]);

  React.useEffect(() => {
    if (bootstrap.status !== 'ready') return;
    if (bookingFunnelViewSentRef.current) return;
    bookingFunnelViewSentRef.current = true;
    funnelInteractivePerfRef.current = performance.now();
    trackBookingFunnelView(funnelAnalyticsBase());
  }, [bootstrap.status, funnelAnalyticsBase]);

  React.useEffect(() => {
    if (bootstrap.status !== 'ready') return;
    if (!bookingFunnelViewSentRef.current) return;
    const slideIndex = (showConfirmation ? 4 : funnelStep + 1) as 1 | 2 | 3 | 4;
    if (lastSlideViewIndexRef.current === slideIndex) return;
    lastSlideViewIndexRef.current = slideIndex;
    trackBookingFunnelSlideView({ slide_index: slideIndex, ...funnelAnalyticsBase() });
  }, [bootstrap.status, funnelStep, showConfirmation, funnelAnalyticsBase]);

  const passengerSlide3 = React.useMemo(
    () => ({
      firstName: passengerFirstName,
      lastName: passengerLastName,
      email: passengerEmail,
      countryIso2: passengerCountryIso2 ?? '',
      phoneNational: passengerPhoneNational,
    }),
    [passengerFirstName, passengerLastName, passengerEmail, passengerCountryIso2, passengerPhoneNational],
  );

  const passengerParsed = React.useMemo(
    () => tripRequestPassengerFieldsSchema.safeParse(passengerSlide3),
    [passengerSlide3],
  );

  const passengerFieldErrors = React.useMemo(
    () => passengerErrorsForDisplay(passengerDirty, passengerParsed),
    [passengerDirty, passengerParsed],
  );

  const fullSubmitParsed = React.useMemo(() => {
    if (!validatedSlide1 || !validatedSlide2Vehicle) return null;
    return tripRequestSubmitPayloadSchema.safeParse({
      slide1: validatedSlide1,
      slide2: validatedSlide2Vehicle,
      slide3: passengerSlide3,
      clientTypeResolution: tripClientResolution ?? undefined,
      purchaseOrderRef: tripPurchaseOrderRef.trim() || null,
    });
  }, [
    validatedSlide1,
    validatedSlide2Vehicle,
    passengerSlide3,
    tripClientResolution,
    tripPurchaseOrderRef,
  ]);

  const tripPoOk =
    !tripInvoicingContext?.defaultPoRequired || tripPurchaseOrderRef.trim().length > 0;

  const showOrgPortalNote = tripClientResolution?.clientType === 'account_client';

  const copyBookingReference = React.useCallback(async () => {
    if (!bookingRefSuccess) return;
    try {
      await navigator.clipboard.writeText(bookingRefSuccess);
      setBookingRefCopied(true);
      window.setTimeout(() => setBookingRefCopied(false), 2000);
    } catch {
      /* clipboard API unavailable (permissions / non-secure context) */
    }
  }, [bookingRefSuccess]);

  const canSubmitTrip =
    fullSubmitParsed?.success === true &&
    submitState !== 'loading' &&
    submitState !== 'success' &&
    tripPoOk;

  const loadVehicleOffers = React.useCallback(async () => {
    if (!validatedSlide1) return;
    setVehicleLoading(true);
    setVehicleFetchError(null);
    const r = await getTripRequestVehicleOffers({ minPassengers: validatedSlide1.passengers });
    if (r.ok) {
      setVehicleOffers(r.vehicles);
      setSelectedVehicleId((prev) => {
        if (!prev) return null;
        return r.vehicles.some((v) => v.id === prev) ? prev : null;
      });
    } else {
      setVehicleOffers(null);
      setVehicleFetchError(r.error);
    }
    setVehicleLoading(false);
  }, [validatedSlide1]);

  const portalHandoffActive = useBookingStore(
    (st) =>
      st.clientTypeResolution?.clientType === 'account_client' &&
      st.clientTypeResolution?.clientTypeSource === 'portal_active_account_session',
  );

  React.useEffect(() => {
    const hint = useBookingStore.getState().preferredVehicleTypeHint;
    if (!hint || !vehicleOffers?.length) return;
    const matchId = pickVehicleIdFromServiceTypeHint(hint, vehicleOffers);
    if (matchId) {
      setSelectedVehicleId(matchId);
    }
  }, [vehicleOffers]);

  React.useEffect(() => {
    if (funnelStep !== 1 || !validatedSlide1 || bootstrap.status !== 'ready') {
      return;
    }
    const payload = JSON.stringify({
      p: validatedSlide1.passengers,
      pu: validatedSlide1.pickup.placeId,
      de: validatedSlide1.destination.placeId,
    });
    if (prevValidatedSlide1Json.current === payload) {
      return;
    }
    prevValidatedSlide1Json.current = payload;
    void loadVehicleOffers();
  }, [funnelStep, validatedSlide1, bootstrap.status, loadVehicleOffers]);

  React.useEffect(() => {
    if (submitState !== 'success') return;
    const id = window.requestAnimationFrame(() => slideHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [submitState]);

  React.useEffect(() => {
    if (isInitialStepMount.current) {
      isInitialStepMount.current = false;
      return;
    }
    if (submitState === 'success') return;
    // On passenger slide, avoid moving focus to the heading during/after submit — FE.19.9 PO error path
    // focuses `#trip-purchase-order-ref`; heading focus would override it on the same tick chain.
    if (funnelStep === 2 && submitState !== 'idle') return;
    const id = window.requestAnimationFrame(() => {
      slideHeadingRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [funnelStep, submitState]);

  /** FE.19.9 — after a PO-related submit error, focus the PO field in layout phase (before paint / useEffect). */
  React.useLayoutEffect(() => {
    if (submitState !== 'error' || !submitMessage || !isPurchaseOrderRequiredSubmitError(submitMessage)) {
      return;
    }
    const el =
      tripPurchaseOrderInputRef.current ?? document.getElementById('trip-purchase-order-ref');
    if (!(el instanceof HTMLElement)) return;
    el.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
    el.focus();
  }, [submitState, submitMessage, reduceMotion]);

  const goNextFromTrip = () => {
    const result = validateRideDetailsStep(rideDetailsDraft);
    if (!result.ok) {
      setRideDetailsFieldErrors(result.errors);
      return;
    }
    setRideDetailsFieldErrors({});
    const nextPlacesJson = JSON.stringify({
      pu: result.data.pickup.placeId,
      de: result.data.destination.placeId,
    });
    if (prevTripPlacesJson.current !== null && prevTripPlacesJson.current !== nextPlacesJson) {
      setValidatedSlide2Vehicle(null);
      setSelectedVehicleId(null);
      setVehicleOffers(null);
    }
    prevTripPlacesJson.current = nextPlacesJson;
    setValidatedSlide1(result.data);
    setFunnelStep(1);
    trackBookingFunnelSlideComplete({ slide_index: 1, ...funnelAnalyticsBase() });
  };

  const goNextFromVehicle = () => {
    if (vehicleLoading) {
      setSlide2Error('Please wait for vehicle classes to load.');
      return;
    }
    if (vehicleFetchError) {
      setSlide2Error('Load vehicle classes or retry before continuing.');
      return;
    }
    const list = vehicleOffers ?? [];
    if (list.length === 0) {
      setSlide2Error(
        'No vehicle classes are available for your selections. Adjust trip details or passengers and try again.',
      );
      return;
    }
    if (!selectedVehicleId) {
      setSlide2Error('Please select a vehicle class to continue.');
      return;
    }
    const chosen = list.find((v) => v.id === selectedVehicleId);
    if (!chosen) {
      setSlide2Error('Your selection is no longer valid. Please choose again.');
      return;
    }
    setValidatedSlide2Vehicle(chosen);
    setSlide2Error(null);
    setFunnelStep(2);
    trackBookingFunnelSlideComplete({ slide_index: 2, ...funnelAnalyticsBase() });
  };

  const goNext = () => {
    if (funnelStep === 0) {
      goNextFromTrip();
      return;
    }
    if (funnelStep === 1) {
      goNextFromVehicle();
    }
  };

  const goBack = () => {
    if (showConfirmation) return;
    setFunnelStep((s) => {
      const next = Math.max(s - 1, 0) as FunnelStep;
      if (s === 1 && validatedSlide1) {
        setRideDetailsDraft(validatedRideDetailsToFormValues(validatedSlide1));
        setRideDetailsFieldErrors({});
      }
      if (s === 2 && validatedSlide2Vehicle) {
        setSelectedVehicleId(validatedSlide2Vehicle.id);
      }
      return next;
    });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (funnelStep !== 2) return;
    if (!fullSubmitParsed?.success) {
      setPassengerDirty({ firstName: true, lastName: true, email: true, country: true, phone: true });
      return;
    }
    if (submitState === 'loading' || submitState === 'success') return;

    setSubmitState('loading');
    setSubmitMessage(null);

    void (async () => {
      const result = opsSubmit
        ? await submitOpsTripRequest({
            ...fullSubmitParsed.data,
            referrerId: opsReferrerId ?? null,
          })
        : await submitTripRequest(fullSubmitParsed.data);
      if (result.success) {
        setSubmitState('success');
        setBookingRefSuccess(result.bookingReference);
        onSubmitSuccess?.();
        trackBookingFunnelSlideComplete({ slide_index: 3, ...funnelAnalyticsBase() });
        const anchor = funnelInteractivePerfRef.current;
        const timeToSubmitMs =
          anchor != null ? Math.max(0, Math.round(performance.now() - anchor)) : 0;
        trackBookingFunnelSubmitSuccess({
          ...funnelAnalyticsBase(),
          booking_reference: result.bookingReference,
          time_to_submit_ms: timeToSubmitMs,
        });
        return;
      }
      setSubmitState('error');
      setSubmitMessage(result.error);
      trackBookingFunnelSubmitError({
        ...funnelAnalyticsBase(),
        error_category: bookingFunnelSubmitErrorCategoryFromMessage(result.error),
      });
    })();
  };

  const motionKey = showConfirmation ? 'done' : String(funnelStep);
  const slideVariants = {
    initial: reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 14 },
    animate: { opacity: 1, x: 0 },
    exit: reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 },
  };

  const isFirstStep = funnelStep === 0 && !showConfirmation;
  const isLastStep = funnelStep === 2 && !showConfirmation;

  const vehicleNextDisabled =
    funnelStep === 1 &&
    (vehicleLoading ||
      Boolean(vehicleFetchError) ||
      (vehicleOffers?.length ?? 0) === 0 ||
      !selectedVehicleId);

  const tripRequestNextAriaLabel = (() => {
    if (showConfirmation) return 'Continue';
    const title = SLIDE_TITLES[funnelStep];
    if (funnelStep !== 1) {
      return `Continue from ${title}`;
    }
    if (vehicleLoading) {
      return 'Continue — wait for vehicle classes to load';
    }
    if (vehicleFetchError) {
      return 'Continue — resolve vehicle classes or retry first';
    }
    if ((vehicleOffers?.length ?? 0) === 0) {
      return 'Continue — no classes match your trip; adjust trip details first';
    }
    if (!selectedVehicleId) {
      return 'Continue — select a class below first';
    }
    return `Continue from ${title}`;
  })();

  if (bootstrap.status === 'loading') {
    return (
      <div
        className={cn(
          'flex w-full max-w-2xl items-center justify-center py-12 text-sm text-muted-foreground font-Poppins',
          embedded && 'mx-auto min-h-0 flex-1',
        )}
        role="status"
        aria-live="polite"
      >
        Loading…
      </div>
    );
  }

  if (bootstrap.status === 'missing_prefill' || bootstrap.status === 'invalid_prefill') {
    const message =
      bootstrap.status === 'missing_prefill'
        ? 'To request a trip, start from the booking search form with your pickup, drop-off, and time.'
        : describeInvalidPrefill(bootstrap.errors);
    return (
      <div
        className={cn(
          'w-full max-w-2xl rounded-xl border border-border bg-card p-6 text-center text-card-foreground shadow-sm sm:p-8',
          embedded && 'mx-auto',
        )}
        role="alert"
      >
        <p className="text-base font-Poppins text-foreground">{message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button type="button" variant="default" asChild>
            <Link href={bookingSearchHref}>Go to booking search</Link>
          </Button>
          {embedded && onExit ? (
            <Button type="button" variant="outline" onClick={onExit}>
              Back to ride search
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full max-w-2xl min-h-0 flex-1 flex-col',
        embedded && 'mx-auto h-full',
      )}
    >
      <form
        className="flex min-h-0 flex-1 flex-col gap-4 font-Poppins text-foreground"
        onSubmit={handleFormSubmit}
        noValidate
      >
        <TripRequestFunnelProgress currentIndex={progressIndex} className="px-1" />

        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm"
          role="region"
          aria-labelledby="trip-request-slide-heading"
        >
          <div className="shrink-0 border-b border-border px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
            <h2
              id="trip-request-slide-heading"
              ref={slideHeadingRef}
              tabIndex={-1}
              className="font-display text-xl font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {showConfirmation ? SLIDE_TITLES[3] : SLIDE_TITLES[funnelStep]}
            </h2>
            {!showConfirmation && funnelStep === 1 ? (
              <p
                id="trip-request-vehicle-slide-intro"
                className="mt-2 text-sm leading-relaxed text-muted-foreground font-Poppins"
              >
                {VEHICLE_SLIDE_INTRO_COPY}
              </p>
            ) : null}
          </div>

          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7 sm:pb-7',
              !embedded && 'max-h-[min(32rem,72vh)]',
            )}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={motionKey}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={slideVariants}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
                className="min-h-0"
              >
                {showConfirmation ? (
                  <div
                    data-testid="trip-request-confirmation"
                    className="rounded-xl border border-border bg-muted/30 p-5 shadow-sm sm:p-6"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-base leading-relaxed text-foreground font-Poppins">
                      Thank you for submitting your trip request. We have received your details and will
                      follow up with the next steps when we are ready.
                    </p>

                    {bookingRefSuccess ? (
                      <div className="mt-5 space-y-2">
                        <p className="text-sm font-medium text-foreground font-Poppins">Booking reference</p>
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <p className="break-all font-mono text-lg font-semibold tracking-tight text-foreground">
                            {bookingRefSuccess}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 w-full shrink-0 sm:w-auto"
                            onClick={() => void copyBookingReference()}
                            aria-label={`Copy booking reference ${bookingRefSuccess}`}
                          >
                            Copy reference
                          </Button>
                        </div>
                        {bookingRefCopied ? (
                          <p className="text-xs text-muted-foreground font-Poppins">Copied</p>
                        ) : null}
                      </div>
                    ) : null}

                    <h3 className="mt-6 text-base font-semibold text-foreground font-Poppins">
                      What happens next
                    </h3>
                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-relaxed text-foreground font-Poppins">
                      <li>Our team reviews your request and trip details.</li>
                      <li>{QUOTE_EMAIL_BUSINESS_HOURS_COPY}</li>
                      <li>After you accept the quote, we send a payment link for your booking.</li>
                    </ol>

                    {showOrgPortalNote ? (
                      <p className="mt-5 text-sm leading-relaxed text-muted-foreground font-Poppins">
                        Your organisation&apos;s account administrators can see this trip request on the
                        account portal.
                      </p>
                    ) : null}

                    {onExit || !embedded ? (
                      <div className="mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
                        {onExit ? (
                          <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={onExit}>
                            Submit another request
                          </Button>
                        ) : null}
                        {!embedded ? (
                          <Button type="button" variant="default" className="min-h-11 w-full sm:w-auto" asChild>
                            <Link href="/">Back to home</Link>
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : funnelStep === 0 ? (
                  <TripRequestRideDetailsSlide
                    values={rideDetailsDraft}
                    onChange={(patch) => {
                      setRideDetailsDraft((prev) => ({ ...prev, ...patch }));
                      setRideDetailsFieldErrors((e) => {
                        const next = { ...e };
                        if ('pickup' in patch || 'pickupInput' in patch) delete next.pickup;
                        if ('destination' in patch || 'destinationInput' in patch) delete next.destination;
                        if ('rideDate' in patch) delete next.rideDate;
                        if ('rideTime' in patch) delete next.rideTime;
                        if ('schedule' in patch) delete next.schedule;
                        if ('passengers' in patch) delete next.passengers;
                        if ('flightNumber' in patch) delete next.flightNumber;
                        if ('manualAirportPickup' in patch) delete next.flightNumber;
                        delete next.submit;
                        return next;
                      });
                    }}
                    errors={rideDetailsFieldErrors}
                  />
                ) : funnelStep === 1 ? (
                  <>
                    {validatedSlide1 && (
                      <p className="sr-only">
                        Trip: pickup {validatedSlide1.pickup.formattedAddress}, drop-off{' '}
                        {validatedSlide1.destination.formattedAddress}.
                      </p>
                    )}
                    <TripRequestVehicleSlide
                      vehicles={vehicleOffers ?? []}
                      selectedId={selectedVehicleId}
                      partyPassengers={validatedSlide1?.passengers ?? 1}
                      onSelect={(id) => {
                        setSelectedVehicleId(id);
                        setSlide2Error(null);
                      }}
                      loading={vehicleLoading}
                      error={vehicleFetchError}
                      onRetry={() => void loadVehicleOffers()}
                      selectionError={slide2Error}
                    />
                  </>
                ) : (
                  <>
                    {validatedSlide2Vehicle && (
                      <p className="sr-only">
                        Selected class: {validatedSlide2Vehicle.name},{' '}
                        {validatedSlide2Vehicle.classification}.
                      </p>
                    )}
                    <TripRequestPassengerSlide
                      firstName={passengerFirstName}
                      lastName={passengerLastName}
                      email={passengerEmail}
                      countryIso2={passengerCountryIso2}
                      phoneNational={passengerPhoneNational}
                      afterEmail={
                        <>
                          {/** Keep gate enabled during submit — `enabled={false}` clears resolution and unmounts PO (FE.19.9). */}
                          <BookingAccountDomainGate
                            variant="inline"
                            email={passengerEmail}
                            enabled={!portalHandoffActive}
                            syncToBookingStore={false}
                            onClientTypeResolutionChange={setTripClientResolution}
                            onInvoicingContextChange={setTripInvoicingContext}
                          />
                          {tripInvoicingContext?.defaultPoRequired &&
                          tripClientResolution?.clientType === 'account_client' ? (
                            <div className="mt-3 space-y-2" data-testid="trip-request-po-inline">
                              <label
                                htmlFor="trip-purchase-order-ref"
                                className="text-sm font-medium text-foreground font-Poppins"
                              >
                                Purchase order reference <span className="text-destructive">*</span>
                              </label>
                              <Input
                                ref={tripPurchaseOrderInputRef}
                                id="trip-purchase-order-ref"
                                type="text"
                                autoComplete="off"
                                value={tripPurchaseOrderRef}
                                onChange={(e) => setTripPurchaseOrderRef(e.target.value)}
                                placeholder="e.g. PO-2026-0042"
                                disabled={submitState === 'loading'}
                                className="min-h-11"
                                aria-invalid={Boolean(
                                  tripInvoicingContext?.defaultPoRequired &&
                                    !tripPurchaseOrderRef.trim(),
                                )}
                              />
                              <p className="text-xs text-muted-foreground font-Poppins">
                                {accountRequiresPurchaseOrderMessage(tripInvoicingContext.accountDisplayName)}
                              </p>
                            </div>
                          ) : null}
                        </>
                      }
                      onFirstNameChange={(v) => {
                        setPassengerFirstName(v);
                        setPassengerDirty((d) => ({ ...d, firstName: true }));
                      }}
                      onLastNameChange={(v) => {
                        setPassengerLastName(v);
                        setPassengerDirty((d) => ({ ...d, lastName: true }));
                      }}
                      onEmailChange={(v) => {
                        setPassengerEmail(v);
                        setPassengerDirty((d) => ({ ...d, email: true }));
                      }}
                      onCountrySelect={(opt: TripRequestCountryOption) => {
                        setPassengerCountryIso2(opt.iso2);
                        setPassengerDirty((d) => ({ ...d, country: true }));
                      }}
                      onPhoneNationalChange={(v) => {
                        setPassengerPhoneNational(v);
                        setPassengerDirty((d) => ({ ...d, phone: true }));
                      }}
                      fieldErrors={passengerFieldErrors}
                      disabled={submitState === 'loading'}
                    />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {submitState === 'error' && submitMessage ? (
          <p
            className="shrink-0 text-center text-sm text-destructive sm:text-left font-Poppins"
            role="alert"
            aria-live="assertive"
          >
            {submitMessage}
          </p>
        ) : null}

        {!showConfirmation ? (
          <div className="flex shrink-0 flex-col-reverse gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              {!isFirstStep && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-11 sm:w-auto"
                  onClick={goBack}
                  aria-label={`Go back from ${SLIDE_TITLES[funnelStep]}`}
                >
                  Back
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {!isLastStep && (
                <Button
                  type="button"
                  data-testid="trip-request-next"
                  className="w-full min-h-11 sm:min-w-[7rem]"
                  onClick={goNext}
                  disabled={vehicleNextDisabled}
                  aria-label={tripRequestNextAriaLabel}
                  aria-describedby={
                    funnelStep === 1 && !showConfirmation ? 'trip-request-vehicle-slide-intro' : undefined
                  }
                >
                  Next
                </Button>
              )}
              {isLastStep && (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <Button
                    type="submit"
                    data-testid="trip-request-submit"
                    disabled={!canSubmitTrip}
                    className="w-full min-h-11 sm:min-w-[7rem]"
                    aria-busy={submitState === 'loading'}
                  >
                    {submitState === 'loading' ? 'Sending…' : 'Submit trip request'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
