/** @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TripRequestCountryOption } from '../load-trip-request-countries';
import { TripRequestPassengerSlide } from '../TripRequestPassengerSlide';

const mockCountries: TripRequestCountryOption[] = [
  { iso2: 'za', name: 'South Africa', dialCode: '27', dialPrefix: '+27' },
  { iso2: 'us', name: 'United States', dialCode: '1', dialPrefix: '+1' },
];

const loadTripRequestCountryOptions = vi.hoisted(() =>
  vi.fn(() => Promise.resolve(mockCountries)),
);

vi.mock('@/features/booking/components/trip-request/load-trip-request-countries', () => ({
  loadTripRequestCountryOptions,
}));

describe('TripRequestPassengerSlide — lazy phone country (FE.19.7)', () => {
  it('shows default dial from ISO2 without opening the country popover', () => {
    loadTripRequestCountryOptions.mockClear();
    render(
      <TripRequestPassengerSlide
        firstName=""
        lastName=""
        email=""
        countryIso2="za"
        phoneNational=""
        onFirstNameChange={() => {}}
        onLastNameChange={() => {}}
        onEmailChange={() => {}}
        onCountrySelect={() => {}}
        onPhoneNationalChange={() => {}}
        fieldErrors={{}}
      />,
    );
    expect(screen.getByTestId('trip-phone-country-trigger')).toBeTruthy();
    expect(screen.getByText('+27')).toBeTruthy();
    expect(loadTripRequestCountryOptions).not.toHaveBeenCalled();
  });

  it('calls loadTripRequestCountryOptions only after opening the country popover', async () => {
    loadTripRequestCountryOptions.mockClear();
    render(
      <TripRequestPassengerSlide
        firstName=""
        lastName=""
        email=""
        countryIso2="za"
        phoneNational=""
        onFirstNameChange={() => {}}
        onLastNameChange={() => {}}
        onEmailChange={() => {}}
        onCountrySelect={() => {}}
        onPhoneNationalChange={() => {}}
        fieldErrors={{}}
      />,
    );
    fireEvent.click(screen.getByTestId('trip-phone-country-trigger'));
    await waitFor(() => {
      expect(loadTripRequestCountryOptions).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('South Africa')).toBeTruthy();
    });
  });

  it('formats a valid national number on blur (libphonenumber)', () => {
    const onPhone = vi.fn();
    render(
      <TripRequestPassengerSlide
        firstName=""
        lastName=""
        email=""
        countryIso2="za"
        phoneNational="0825551234"
        onFirstNameChange={() => {}}
        onLastNameChange={() => {}}
        onEmailChange={() => {}}
        onCountrySelect={() => {}}
        onPhoneNationalChange={onPhone}
        fieldErrors={{}}
      />,
    );
    const input = document.getElementById('trip-request-phone-national') as HTMLInputElement;
    fireEvent.blur(input);
    expect(onPhone).toHaveBeenCalled();
    const formatted = onPhone.mock.calls[0]?.[0] as string;
    expect(formatted.length).toBeGreaterThan(0);
  });
});
