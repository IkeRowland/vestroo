/** @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitTripRequest } from '@/actions/submitTripRequest';
import type { AccountDomainCandidateRow } from '@/actions/client-type-resolution';
import { accountRequiresPurchaseOrderMessage } from '@/lib/account-po-policy';
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
  const vLabel = screen.getByText('Alpha Shuttle').closest('label') as HTMLElement;
  fireEvent.click(within(vLabel).getByRole('radio'));
  fireEvent.click(screen.getByTestId('trip-request-next'));
  await waitFor(() => {
    expect(document.getElementById('trip-request-email')).toBeTruthy();
  });
}

describe('TripRequestBookingShell — FE.19.8 inline org notice', () => {
  beforeEach(() => {
    resolveAccountsByEmailDomain.mockReset();
    resolveAccountsByEmailDomain.mockResolvedValue({
      success: true as const,
      domain: 'example.com',
      accounts: [corpRow()],
    });
  });

  it('shows inline business notice on slide 3 (no domain modal)', async () => {
    render(
      <TripRequestBookingShell
        embedded
        embeddedRidePrefill={validEmbeddedPrefill()}
      />,
    );

    await navigateToPassengerSlide();

    fireEvent.change(document.getElementById('trip-request-email') as HTMLInputElement, {
      target: { value: 'booker@example.com' },
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('booking-account-domain-inline')).toBeTruthy();
      },
      { timeout: 4000 },
    );

    expect(screen.queryByTestId('booking-account-domain-dialog')).toBeNull();
  });

  it('guest dismiss removes inline notice', async () => {
    render(
      <TripRequestBookingShell
        embedded
        embeddedRidePrefill={validEmbeddedPrefill()}
      />,
    );

    await navigateToPassengerSlide();

    fireEvent.change(document.getElementById('trip-request-email') as HTMLInputElement, {
      target: { value: 'booker@example.com' },
    });

    await waitFor(() => screen.getByTestId('booking-account-domain-inline'), { timeout: 4000 });

    fireEvent.click(screen.getByTestId('booking-account-domain-dismiss-guest'));

    await waitFor(() => {
      expect(screen.queryByTestId('booking-account-domain-inline')).toBeNull();
    });
  });
});

describe('TripRequestBookingShell — FE.19.9 inline PO (slide 3)', () => {
  beforeEach(() => {
    resolveAccountsByEmailDomain.mockReset();
    resolveAccountsByEmailDomain.mockResolvedValue({
      success: true as const,
      domain: 'example.com',
      accounts: [corpRow({ default_po_required: true })],
    });
    vi.mocked(submitTripRequest).mockReset();
    vi.mocked(submitTripRequest).mockResolvedValue({ success: false as const, error: 'mock' });
  });

  it('renders PO below email (before phone) when defaultPoRequired', async () => {
    render(
      <TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} />,
    );

    await navigateToPassengerSlide();
    fireEvent.change(document.getElementById('trip-request-email') as HTMLInputElement, {
      target: { value: 'booker@example.com' },
    });

    await waitFor(() => expect(screen.getByTestId('trip-request-po-inline')).toBeTruthy(), {
      timeout: 4000,
    });

    const email = document.getElementById('trip-request-email');
    const po = document.getElementById('trip-purchase-order-ref');
    const phone = document.getElementById('trip-request-phone-national');
    expect(email && po && phone).toBeTruthy();
    expect(
      email!.compareDocumentPosition(po!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      po!.compareDocumentPosition(phone!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('hides PO after guest dismiss', async () => {
    render(
      <TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} />,
    );

    await navigateToPassengerSlide();
    fireEvent.change(document.getElementById('trip-request-email') as HTMLInputElement, {
      target: { value: 'booker@example.com' },
    });

    await waitFor(() => expect(screen.getByTestId('trip-request-po-inline')).toBeTruthy(), {
      timeout: 4000,
    });

    fireEvent.click(screen.getByTestId('booking-account-domain-dismiss-guest'));

    await waitFor(() => {
      expect(screen.queryByTestId('trip-request-po-inline')).toBeNull();
    });
  });

  it('focuses PO input when submit returns PO-required server error', async () => {
    vi.mocked(submitTripRequest).mockResolvedValue({
      success: false as const,
      error: accountRequiresPurchaseOrderMessage('Example Corp'),
    });

    render(
      <TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} />,
    );

    await navigateToPassengerSlide();

    fireEvent.change(document.getElementById('trip-request-first-name') as HTMLInputElement, {
      target: { value: 'Pat' },
    });
    fireEvent.change(document.getElementById('trip-request-last-name') as HTMLInputElement, {
      target: { value: 'Lee' },
    });
    fireEvent.change(document.getElementById('trip-request-email') as HTMLInputElement, {
      target: { value: 'booker@example.com' },
    });

    await waitFor(() => expect(screen.getByTestId('trip-request-po-inline')).toBeTruthy(), {
      timeout: 4000,
    });

    fireEvent.change(document.getElementById('trip-purchase-order-ref') as HTMLInputElement, {
      target: { value: 'PO-TEST-1' },
    });
    fireEvent.change(document.getElementById('trip-request-phone-national') as HTMLInputElement, {
      target: { value: '821234567' },
    });

    fireEvent.click(screen.getByTestId('trip-request-submit'));

    await waitFor(() => {
      expect(vi.mocked(submitTripRequest)).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(document.activeElement?.id).toBe('trip-purchase-order-ref');
    });
  });
});
