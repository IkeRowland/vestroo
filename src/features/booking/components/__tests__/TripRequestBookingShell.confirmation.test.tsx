/** @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountDomainCandidateRow } from '@/actions/client-type-resolution';
import {
  defaultRideDetailsFormValues,
  type RideDetailsFormValues,
} from '@/features/booking/components/trip-request/ride-details-validate';

import { TripRequestBookingShell } from '../TripRequestBookingShell';

vi.mock('@/actions/submitTripRequest', () => ({
  submitTripRequest: vi.fn(() => Promise.resolve({ success: false as const, error: 'mock' })),
}));

vi.mock('@/actions/getTripRequestVehicleOffers', () => ({
  getTripRequestVehicleOffers: vi.fn(() =>
    Promise.resolve({
      ok: true as const,
      vehicles: [
        {
          id: 'veh-a',
          name: 'Alpha Shuttle',
          classification: 'MPV class',
          passengerCapacity: 8,
          luggageCapacityLabel: '6 bags',
        },
      ],
    }),
  ),
}));

vi.mock('@/features/booking/components/trip-request/load-trip-request-countries', () => ({
  loadTripRequestCountryOptions: vi.fn(() => Promise.resolve([])),
}));

const getTripRequestPrefillForBootstrap = vi.hoisted(() => vi.fn<[], RideDetailsFormValues | null>());

vi.mock('@/features/booking/components/trip-request/trip-request-prefill', () => ({
  getTripRequestPrefillForBootstrap,
  TRIP_REQUEST_PREFILL_STORAGE_KEY: 'vestroo-trip-request-prefill-v1',
}));

const resolveAccountsByEmailDomain = vi.hoisted(() => vi.fn());

vi.mock('@/actions/resolveAccountsByEmailDomain', () => ({
  resolveAccountsByEmailDomain,
}));

const baseLoc = {
  placeId: 'ChIJx',
  formattedAddress: '1 Example St',
  name: 'Example',
  latitude: -26.0,
  longitude: 28.0,
};

function validEmbeddedPrefill(): RideDetailsFormValues {
  return {
    ...defaultRideDetailsFormValues(),
    pickup: { ...baseLoc, types: ['establishment'] },
    destination: { ...baseLoc, placeId: 'ChIJy' },
    pickupInput: baseLoc.formattedAddress,
    destinationInput: baseLoc.formattedAddress,
    rideDate: '2099-06-20',
    rideTime: '12:00',
    passengers: 2,
  };
}

const corpRow = (over: Partial<AccountDomainCandidateRow> = {}): AccountDomainCandidateRow => ({
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Example Corp',
  credit_terms_days: 30,
  default_billing_entity_ref: null,
  default_po_required: false,
  ...over,
});

async function navigateToPassengerSlide() {
  fireEvent.click(screen.getByTestId('trip-request-next'));
  await waitFor(() => screen.getByText(/Alpha Shuttle/));
  const vLabel = screen.getByText(/Alpha Shuttle/).closest('label') as HTMLElement;
  fireEvent.click(within(vLabel).getByRole('radio'));
  fireEvent.click(screen.getByTestId('trip-request-next'));
  await waitFor(() => {
    expect(document.getElementById('trip-request-email')).toBeTruthy();
  });
}

async function submitPassengerForm() {
  fireEvent.change(document.getElementById('trip-request-first-name') as HTMLInputElement, {
    target: { value: 'Pat' },
  });
  fireEvent.change(document.getElementById('trip-request-last-name') as HTMLInputElement, {
    target: { value: 'Lee' },
  });
  fireEvent.change(document.getElementById('trip-request-email') as HTMLInputElement, {
    target: { value: 'booker@example.com' },
  });
  fireEvent.change(document.getElementById('trip-request-phone-national') as HTMLInputElement, {
    target: { value: '821234567' },
  });
  fireEvent.click(screen.getByTestId('trip-request-submit'));
}

describe('TripRequestBookingShell — slide 4 confirmation (FE.19.12)', () => {
  beforeEach(() => {
    getTripRequestPrefillForBootstrap.mockReset();
    resolveAccountsByEmailDomain.mockReset();
    resolveAccountsByEmailDomain.mockResolvedValue({
      success: true as const,
      domain: 'example.com',
      accounts: [corpRow()],
    });
  });

  it('shows Request received, three steps, booking ref, Submit another request when onExit, and no forbidden payment strings', async () => {
    const { submitTripRequest } = await import('@/actions/submitTripRequest');
    vi.mocked(submitTripRequest).mockResolvedValue({
      success: true as const,
      bookingId: 'bid-1',
      bookingReference: 'VST-ABCDEF12',
    });

    const onExit = vi.fn();
    render(
      <TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} onExit={onExit} />,
    );

    await navigateToPassengerSlide();
    await submitPassengerForm();

    await waitFor(() => {
      expect(screen.getByTestId('trip-request-confirmation')).toBeTruthy();
    });

    const heading = screen.getByRole('heading', { level: 2, name: 'Request received' });
    expect(heading).toBeTruthy();

    const panel = screen.getByTestId('trip-request-confirmation');
    const items = within(panel).getAllByRole('listitem');
    expect(items).toHaveLength(3);

    expect(within(panel).getByText('VST-ABCDEF12')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit another request' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Back to home' })).toBeNull();

    const html = panel.innerHTML.toLowerCase();
    expect(html).not.toMatch(/pay\s*now/);
    expect(html).not.toContain('payfast');
    expect(html).not.toMatch(/instant\s*quote/);
  });

  it('shows Back to home on standalone success and omits Submit another request without onExit', async () => {
    getTripRequestPrefillForBootstrap.mockReturnValue(validEmbeddedPrefill());

    const { submitTripRequest } = await import('@/actions/submitTripRequest');
    vi.mocked(submitTripRequest).mockResolvedValue({
      success: true as const,
      bookingId: 'bid-2',
      bookingReference: 'VST-STAND01',
    });

    render(<TripRequestBookingShell embedded={false} />);

    await waitFor(() => expect(screen.getByTestId('trip-request-next')).toBeTruthy());

    await navigateToPassengerSlide();
    await submitPassengerForm();

    await waitFor(() => {
      expect(screen.getByTestId('trip-request-confirmation')).toBeTruthy();
    });

    const home = screen.getByRole('link', { name: 'Back to home' });
    expect(home.getAttribute('href')).toBe('/');
    expect(screen.queryByRole('button', { name: 'Submit another request' })).toBeNull();
  });

  it('shows org portal note when traveller resolves as account_client before submit', async () => {
    const { submitTripRequest } = await import('@/actions/submitTripRequest');
    vi.mocked(submitTripRequest).mockResolvedValue({
      success: true as const,
      bookingId: 'bid-3',
      bookingReference: 'VST-ORGNOTE1',
    });

    render(<TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} />);

    await navigateToPassengerSlide();

    fireEvent.change(document.getElementById('trip-request-email') as HTMLInputElement, {
      target: { value: 'booker@example.com' },
    });

    await waitFor(() => expect(screen.getByTestId('booking-account-domain-inline')).toBeTruthy(), {
      timeout: 4000,
    });

    fireEvent.change(document.getElementById('trip-request-first-name') as HTMLInputElement, {
      target: { value: 'Pat' },
    });
    fireEvent.change(document.getElementById('trip-request-last-name') as HTMLInputElement, {
      target: { value: 'Lee' },
    });
    fireEvent.change(document.getElementById('trip-request-phone-national') as HTMLInputElement, {
      target: { value: '821234567' },
    });

    fireEvent.click(screen.getByTestId('trip-request-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('trip-request-confirmation')).toBeTruthy();
    });

    expect(
      screen.getByText(/account administrators can see this trip request on the account portal/i),
    ).toBeTruthy();
  });
});
