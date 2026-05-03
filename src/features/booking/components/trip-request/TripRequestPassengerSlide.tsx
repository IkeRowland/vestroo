'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import type { CountryCode } from 'libphonenumber-js';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import type { TripRequestCountryOption } from '@/features/booking/components/trip-request/load-trip-request-countries';
import {
  dialPrefixFromIso2,
  flagEmojiFromIso2,
} from '@/features/booking/components/trip-request/trip-request-phone-country-display';

const TripRequestCountryPickerPanel = dynamic(
  () => import('@/features/booking/components/trip-request/TripRequestCountryPickerPanel'),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-sm text-slate-600" role="status" aria-live="polite">
        Loading countries…
      </div>
    ),
  },
);

export type PassengerFieldErrors = Partial<
  Record<'firstName' | 'lastName' | 'email' | 'countryIso2' | 'phoneNational', string>
>;

type TripRequestPassengerSlideProps = {
  firstName: string;
  lastName: string;
  email: string;
  countryIso2: string | null;
  phoneNational: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onCountrySelect: (option: TripRequestCountryOption) => void;
  onPhoneNationalChange: (v: string) => void;
  fieldErrors: PassengerFieldErrors;
  disabled?: boolean;
  /** FE.19.8 — rendered directly under the email field (e.g. inline business-domain notice). */
  afterEmail?: React.ReactNode;
};

const PHONE_COUNTRY_TRIGGER_ID = 'trip-request-phone-country-trigger';

export function TripRequestPassengerSlide({
  firstName,
  lastName,
  email,
  countryIso2,
  phoneNational,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onCountrySelect,
  onPhoneNationalChange,
  fieldErrors,
  disabled,
  afterEmail,
}: TripRequestPassengerSlideProps) {
  const [countryPopoverOpen, setCountryPopoverOpen] = React.useState(false);
  const [countryListCache, setCountryListCache] = React.useState<TripRequestCountryOption[] | null>(null);

  const onCountryListCache = React.useCallback((opts: TripRequestCountryOption[]) => {
    setCountryListCache(opts);
  }, []);

  const displayDial =
    countryListCache?.find((c) => c.iso2 === countryIso2)?.dialPrefix ??
    dialPrefixFromIso2(countryIso2) ??
    '—';

  const countryNameForAria =
    countryListCache?.find((c) => c.iso2 === countryIso2)?.name ?? countryIso2?.toUpperCase() ?? 'Unknown';

  const handlePhoneNationalBlur = () => {
    const iso = countryIso2?.trim();
    if (!iso || !phoneNational.trim()) return;
    try {
      const parsed = parsePhoneNumberFromString(
        phoneNational.trim(),
        iso.toUpperCase() as CountryCode,
      );
      if (parsed?.isValid()) {
        onPhoneNationalChange(parsed.formatNational());
      }
    } catch {
      /* ignore parse errors — validation still runs on submit */
    }
  };

  return (
    <div className="space-y-5 font-Poppins">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="trip-request-first-name" required>
            First name
          </Label>
          <Input
            id="trip-request-first-name"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            disabled={disabled}
            aria-invalid={fieldErrors.firstName ? true : undefined}
            className={cn(fieldErrors.firstName && 'border-destructive')}
          />
          {fieldErrors.firstName ? (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {fieldErrors.firstName}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="trip-request-last-name" required>
            Last name
          </Label>
          <Input
            id="trip-request-last-name"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            disabled={disabled}
            aria-invalid={fieldErrors.lastName ? true : undefined}
            className={cn(fieldErrors.lastName && 'border-destructive')}
          />
          {fieldErrors.lastName ? (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {fieldErrors.lastName}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <Label htmlFor="trip-request-email" required>
          Email
        </Label>
        <Input
          id="trip-request-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={disabled}
          aria-invalid={fieldErrors.email ? true : undefined}
            className={cn(fieldErrors.email && 'border-destructive')}
        />
        {fieldErrors.email ? (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {fieldErrors.email}
          </p>
        ) : null}
        {afterEmail ? <div className="mt-3">{afterEmail}</div> : null}
      </div>

      <div>
        <span
          id="trip-request-phone-heading"
          className="mb-1 block font-display text-sm font-semibold text-foreground"
        >
          Phone number <span className="text-destructive">*</span>
        </span>
        <p id="trip-request-phone-hint" className="mb-2 text-xs text-slate-500">
          Tap the country button to change region. Enter your number without the country code — the prefix matches your
          selection.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                id={PHONE_COUNTRY_TRIGGER_ID}
                data-testid="trip-phone-country-trigger"
                disabled={disabled}
                aria-label={`Change phone country. Current: ${countryNameForAria}, dial code ${displayDial}.`}
                aria-describedby="trip-request-phone-hint"
                className={cn(
                  'flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm font-semibold text-foreground shadow-sm transition-colors',
                  'hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  fieldErrors.countryIso2 && 'border-destructive',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {flagEmojiFromIso2(countryIso2)}
                </span>
                <span className="tabular-nums">{displayDial}</span>
                <span className="sr-only">Opens country list</span>
                <span className="text-slate-400" aria-hidden>
                  ▾
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[min(calc(100vw-1.5rem),22rem)] border border-border bg-card p-0 text-card-foreground shadow-lg"
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                document.getElementById(PHONE_COUNTRY_TRIGGER_ID)?.focus();
              }}
            >
              <TripRequestCountryPickerPanel
                idPrefix="trip-request-phone-country"
                valueIso2={countryIso2}
                cachedOptions={countryListCache}
                onCachedOptions={onCountryListCache}
                onPick={(opt) => {
                  onCountrySelect(opt);
                  setCountryPopoverOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <div className="min-w-0 flex-1">
            <Label htmlFor="trip-request-phone-national" className="sr-only">
              Phone number (national)
            </Label>
            <Input
              id="trip-request-phone-national"
              name="phoneNational"
              type="tel"
              autoComplete="tel-national"
              inputMode="tel"
              value={phoneNational}
              onChange={(e) => onPhoneNationalChange(e.target.value)}
              onBlur={handlePhoneNationalBlur}
              disabled={disabled}
              placeholder="e.g. mobile or landline"
              aria-invalid={fieldErrors.phoneNational ? true : undefined}
              aria-labelledby="trip-request-phone-heading"
              aria-describedby="trip-request-phone-hint"
              className={cn(fieldErrors.phoneNational && 'border-destructive')}
            />
          </div>
        </div>
        {fieldErrors.countryIso2 ? (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {fieldErrors.countryIso2}
          </p>
        ) : null}
        {fieldErrors.phoneNational ? (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {fieldErrors.phoneNational}
          </p>
        ) : null}
      </div>
    </div>
  );
}
