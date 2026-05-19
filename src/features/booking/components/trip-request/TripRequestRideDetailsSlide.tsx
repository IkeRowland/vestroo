'use client';

import * as React from 'react';
import { useReducedMotion } from 'framer-motion';

import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaceResult } from '@/lib/maps';
import type { RideDetailsFieldErrors, RideDetailsFormValues, TripRequestLocation } from './ride-details-validate';
import { effectiveAirportPickup } from './ride-details-validate';
import { loadFeaturedPickupLocations, type FeaturedPickupLocation } from './loadFeaturedPickupLocations';
import {
  appendSessionRecentAddress,
  readSessionRecentAddresses,
} from './session-recent-addresses';
import { swapRideDetailsPickupDestination } from './swap-ride-details';
import { TripRequestPickupSchedule } from './TripRequestPickupSchedule';
import { TripRequestPassengerStepper } from './TripRequestPassengerStepper';

function placeToTripLocation(place: PlaceResult): TripRequestLocation | null {
  if (!place.place_id || !place.geometry?.location) return null;
  return {
    placeId: place.place_id,
    formattedAddress: place.formatted_address ?? '',
    name: place.name ?? place.formatted_address ?? '',
    latitude: place.geometry.location.lat(),
    longitude: place.geometry.location.lng(),
    types: place.types,
  };
}

type TripRequestRideDetailsSlideProps = {
  values: RideDetailsFormValues;
  onChange: (patch: Partial<RideDetailsFormValues>) => void;
  errors: RideDetailsFieldErrors;
};

export function TripRequestRideDetailsSlide({
  values,
  onChange,
  errors,
}: TripRequestRideDetailsSlideProps) {
  const reduceMotion = useReducedMotion();
  const showFlight = effectiveAirportPickup(values.pickup, values.manualAirportPickup);
  const prevShowFlight = React.useRef(showFlight);
  const [a11yFlightNote, setA11yFlightNote] = React.useState('');
  const [featuredPickups, setFeaturedPickups] = React.useState<FeaturedPickupLocation[]>([]);
  const [recentsPanel, setRecentsPanel] = React.useState<'pickup' | 'destination' | null>(null);
  const [swapHighlight, setSwapHighlight] = React.useState(false);
  const pickupBlurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationBlurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void loadFeaturedPickupLocations().then((rows) => {
      if (!cancelled) setFeaturedPickups(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (prevShowFlight.current === showFlight) return;
    prevShowFlight.current = showFlight;
    if (showFlight) {
      setA11yFlightNote('Flight number field shown. Optional but recommended for airport pickups.');
    } else {
      setA11yFlightNote('Flight number field hidden. It is not needed for this pickup.');
    }
  }, [showFlight]);

  const clearPickupBlurTimer = React.useCallback(() => {
    if (pickupBlurTimer.current) {
      clearTimeout(pickupBlurTimer.current);
      pickupBlurTimer.current = null;
    }
  }, []);

  const clearDestinationBlurTimer = React.useCallback(() => {
    if (destinationBlurTimer.current) {
      clearTimeout(destinationBlurTimer.current);
      destinationBlurTimer.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      clearPickupBlurTimer();
      clearDestinationBlurTimer();
    };
  }, [clearDestinationBlurTimer, clearPickupBlurTimer]);

  const rememberResolvedLocation = React.useCallback((loc: TripRequestLocation) => {
    appendSessionRecentAddress(loc);
  }, []);

  const handlePickupSelect = (place: PlaceResult) => {
    const loc = placeToTripLocation(place);
    if (!loc) return;
    rememberResolvedLocation(loc);
    onChange({
      pickup: loc,
      pickupInput: loc.formattedAddress,
    });
  };

  const handlePickupInputChange = (value: string) => {
    const next: Partial<RideDetailsFormValues> = { pickupInput: value };
    if (values.pickup && value.trim() !== values.pickup.formattedAddress.trim()) {
      next.pickup = null;
    }
    onChange(next);
  };

  const handleDestinationSelect = (place: PlaceResult) => {
    const loc = placeToTripLocation(place);
    if (!loc) return;
    rememberResolvedLocation(loc);
    onChange({
      destination: loc,
      destinationInput: loc.formattedAddress,
    });
  };

  const handleDestinationInputChange = (value: string) => {
    const next: Partial<RideDetailsFormValues> = { destinationInput: value };
    if (values.destination && value.trim() !== values.destination.formattedAddress.trim()) {
      next.destination = null;
    }
    onChange(next);
  };

  const applyPickupFromStoredLocation = React.useCallback(
    (loc: TripRequestLocation) => {
      rememberResolvedLocation(loc);
      onChange({
        pickup: loc,
        pickupInput: loc.formattedAddress,
      });
    },
    [onChange, rememberResolvedLocation],
  );

  const applyDestinationFromStoredLocation = React.useCallback(
    (loc: TripRequestLocation) => {
      rememberResolvedLocation(loc);
      onChange({
        destination: loc,
        destinationInput: loc.formattedAddress,
      });
    },
    [onChange, rememberResolvedLocation],
  );

  const sessionRecents =
    recentsPanel != null ? readSessionRecentAddresses() : [];

  const handleSwap = React.useCallback(() => {
    onChange(swapRideDetailsPickupDestination(values));
    if (reduceMotion) return;
    setSwapHighlight(true);
    window.setTimeout(() => setSwapHighlight(false), 200);
  }, [onChange, reduceMotion, values]);

  return (
    <div className="mt-5 space-y-5 font-Poppins">
      <p className="text-base leading-relaxed text-muted-foreground">
        Enter your ride details. Pricing is confirmed by our team after you submit your request — no
        instant quotes here.
      </p>

      <div aria-live="polite" className="sr-only">
        {a11yFlightNote}
      </div>

      <section
        className={cn(
          'space-y-4 rounded-xl border border-transparent bg-transparent p-0 transition-[box-shadow] duration-200',
          swapHighlight &&
            !reduceMotion &&
            'border-primary/35 shadow-[0_0_0_1px_hsl(var(--primary)/0.28)]',
          'lg:border-border lg:bg-card lg:p-4 lg:shadow-sm',
        )}
        aria-label="Origin and destination"
      >
        <h3 className="hidden font-display text-sm font-semibold text-foreground lg:block">
          Origin & destination
        </h3>

        {featuredPickups.length > 0 ? (
          <div>
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Popular pickups
            </p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              {featuredPickups.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="shrink-0 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyPickupFromStoredLocation(row.location)}
                >
                  {row.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-start lg:gap-3">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="trip-pickup" className="font-display text-sm font-semibold text-foreground" required>
              Pickup address
            </Label>
            <AddressAutocomplete
              label=""
              value={values.pickupInput}
              onChange={handlePickupInputChange}
              onSelect={handlePickupSelect}
              placeholder="Search pickup address"
              required
              error={errors.pickup}
              inputId="trip-pickup"
              iconPadding
              icon="pickup"
              onInputFocus={() => {
                clearPickupBlurTimer();
                if (!values.pickupInput.trim()) {
                  setRecentsPanel('pickup');
                }
              }}
              onInputBlur={() => {
                clearPickupBlurTimer();
                pickupBlurTimer.current = setTimeout(() => setRecentsPanel(null), 180);
              }}
            />
            {recentsPanel === 'pickup' && !values.pickupInput.trim() && sessionRecents.length > 0 ? (
              <div
                role="listbox"
                aria-label="Recent addresses this session"
                className="rounded-lg border border-border bg-card p-1 shadow-sm"
              >
                {sessionRecents.map((row) => (
                  <button
                    key={row.location.placeId}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="block w-full rounded-md px-2 py-2 text-left text-xs text-foreground hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      clearPickupBlurTimer();
                      applyPickupFromStoredLocation(row.location);
                      setRecentsPanel(null);
                    }}
                  >
                    <span className="font-medium">{row.location.name || row.location.formattedAddress}</span>
                    {row.location.name ? (
                      <span className="mt-0.5 block text-[11px] text-slate-500">{row.location.formattedAddress}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex justify-center lg:self-center lg:px-0">
            <button
              type="button"
              aria-label="Swap pickup and drop-off"
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                reduceMotion ? '' : 'duration-200 ease-out active:scale-95',
              )}
              onClick={handleSwap}
            >
              <ArrowDownUp className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="min-w-0 space-y-2">
            <Label htmlFor="trip-dropoff" className="font-display text-sm font-semibold text-foreground" required>
              Drop-off address
            </Label>
            <AddressAutocomplete
              label=""
              value={values.destinationInput}
              onChange={handleDestinationInputChange}
              onSelect={handleDestinationSelect}
              placeholder="Search drop-off address"
              required
              error={errors.destination}
              inputId="trip-dropoff"
              iconPadding
              icon="dropoff"
              onInputFocus={() => {
                clearDestinationBlurTimer();
                if (!values.destinationInput.trim()) {
                  setRecentsPanel('destination');
                }
              }}
              onInputBlur={() => {
                clearDestinationBlurTimer();
                destinationBlurTimer.current = setTimeout(() => setRecentsPanel(null), 180);
              }}
            />
            {recentsPanel === 'destination' && !values.destinationInput.trim() && sessionRecents.length > 0 ? (
              <div
                role="listbox"
                aria-label="Recent addresses this session"
                className="rounded-lg border border-border bg-card p-1 shadow-sm"
              >
                {sessionRecents.map((row) => (
                  <button
                    key={`${row.location.placeId}-dest`}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="block w-full rounded-md px-2 py-2 text-left text-xs text-foreground hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      clearDestinationBlurTimer();
                      applyDestinationFromStoredLocation(row.location);
                      setRecentsPanel(null);
                    }}
                  >
                    <span className="font-medium">{row.location.name || row.location.formattedAddress}</span>
                    {row.location.name ? (
                      <span className="mt-0.5 block text-[11px] text-slate-500">{row.location.formattedAddress}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <TripRequestPickupSchedule
        rideDate={values.rideDate}
        rideTime={values.rideTime}
        onChange={(patch) => onChange(patch)}
        errors={{
          rideDate: errors.rideDate,
          rideTime: errors.rideTime,
          schedule: errors.schedule,
        }}
      />

      <div className="space-y-2">
        <Label htmlFor="trip-passengers" className="font-display text-sm font-semibold text-foreground" required>
          Passengers
        </Label>
        <TripRequestPassengerStepper
          id="trip-passengers"
          value={values.passengers}
          onChange={(n) => onChange({ passengers: n })}
          error={errors.passengers}
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-sm font-semibold text-foreground">Airport pickup</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Turn on if your pickup is at an airport and suggestions did not detect it. You can add
              a flight number below when shown — it is optional but helps dispatch.
            </p>
          </div>
          <Switch
            checked={values.manualAirportPickup}
            onCheckedChange={(checked) => onChange({ manualAirportPickup: checked })}
            aria-label="This is an airport pickup"
          />
        </div>
      </div>

      {showFlight ? (
        <div className="min-h-[5.5rem] space-y-2">
          <Label htmlFor="trip-flight" className="font-display text-sm font-semibold text-foreground">
            Flight number <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="trip-flight"
            type="text"
            autoComplete="off"
            value={values.flightNumber}
            onChange={(e) => onChange({ flightNumber: e.target.value })}
            placeholder="e.g. SA 123"
            className="h-12 min-h-11 text-sm"
            aria-invalid={!!errors.flightNumber}
            aria-describedby={errors.flightNumber ? 'trip-flight-error' : undefined}
          />
          {errors.flightNumber && (
            <p id="trip-flight-error" className="text-xs text-destructive font-Poppins" role="alert">
              {errors.flightNumber}
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="trip-instructions" className="font-display text-sm font-semibold text-foreground">
          Special instructions <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="trip-instructions"
          value={values.specialInstructions}
          onChange={(e) => onChange({ specialInstructions: e.target.value })}
          placeholder="Stops, child seats, accessibility, meet-and-greet name on sign…"
          rows={3}
          className="min-h-[5rem] resize-y text-sm"
        />
      </div>

      {errors.submit && (
        <p className="text-sm text-destructive font-Poppins" role="alert">
          {errors.submit}
        </p>
      )}
    </div>
  );
}
